# Communication Architecture - Teleconsultation System

## Overview
The system uses a **Gateway + Microservices** architecture with three communication layers:

```
┌─────────────────┐
│    Frontend     │ (React + Axios)
│   TypeScript    │
└────────┬────────┘
         │ HTTP/REST
         │ (Bearer JWT)
         ▼
┌─────────────────────────────────────┐
│      API Gateway (Port 3045)        │ (NestJS)
│  - Routing & Load Balancing        │
│  - JWT Authentication              │
│  - CORS Handling                   │
└────────┬────────────────────────────┘
         │
         ├─────────────────────┬─────────────────────┐
         │                     │                     │
      HTTP/REST              TCP                  HTTP/REST
      (Direct)          (Message Pattern)       (Direct)
         │                     │                     │
    ┌────▼─────┐  ┌───────────▼──────────┐  ┌──────▼──────┐
    │ Services │  │  Microservices       │  │  External   │
    │ (HTTP)   │  │  (TCP Listeners)     │  │  Services   │
    └──────────┘  └──────────────────────┘  └─────────────┘
     - Messages    - Payments                - Ollama AI
     - Video       - Notifications
     - Medical     - Rendezvous
       Records     - Availability
                   - AI Service
```

---

## 1. Frontend → Gateway Communication

### **Protocol**: HTTP/REST + JWT

**File**: [teleconsultation-frontend/src/api/axios.ts](teleconsultation-frontend/src/api/axios.ts)

```typescript
const api = axios.create({
  baseURL: config.API_BASE_URL,        // http://localhost:3045/api
  timeout: 30000,
  withCredentials: true,                // Send cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auto-attach JWT token from localStorage
api.interceptors.request.use((requestConfig) => {
  const token = localStorage.getItem(config.TOKEN_KEY)
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`
  }
  return requestConfig
})
```

### **Example: Consultation Upload**
**File**: [teleconsultation-frontend/src/api/consultation.ts](teleconsultation-frontend/src/api/consultation.ts)

```typescript
saveMedicalRecord: async (appointmentId: string, data: {...}) => {
  // POST /api/medical-records
  return axios.post('/medical-records', {
    patientId, doctorId, rendezvousId,
    diagnosis, notes, prescriptions
  })
}
```

### **Gateway Setup**
**File**: [api-gateway/src/main.ts](TEM-DDC/api-gateway/src/main.ts)

```typescript
async function bootstrap() {
  // ✅ CORS enabled for frontend origins
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://front.mediwave.tn',
    ],
    credentials: true,  // Allow cookies
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  })

  app.setGlobalPrefix('api');
  await app.listen(3045, '0.0.0.0');
  // 📚 Swagger docs: http://localhost:3045/api
}
```

---

## 2. Gateway → Microservices Communication

The gateway uses **two communication patterns** depending on the microservice:

### **Pattern A: HTTP (Direct Proxy)**

Used for services that expose HTTP/REST endpoints:

**Services**: Messages, Video Consultation, Medical Records, Rendezvous

**Example - Messages**
**File**: [api-gateway/src/gateway/messages.gateway.controller.ts](TEM-DDC/api-gateway/src/gateway/messages.gateway.controller.ts)

```typescript
@Controller('messages/conversations')
export class MessagesGatewayController {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    // Get service URL from env
    const url = this.config.get<string>('MESSAGES_SERVICE_URL') 
                || 'http://localhost:3060';
    this.baseUrl = trimSlashEnd(url) + '/conversations';
  }

  @Post()
  async createConversation(@Req() req: any, @Body() body: any) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(this.baseUrl, body, { 
          headers: this.passHeaders(req)  // Forward auth headers
        }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }
}
```

**Environment Configuration**:
```env
MESSAGES_SERVICE_URL=http://localhost:3060
RENDEZVOUS_SERVICE_URL=http://localhost:3010
VIDEO_CONSULTATION_SERVICE_URL=http://localhost:3020
MEDICAL_RECORDS_SERVICE_URL=http://localhost:3030
```

---

### **Pattern B: TCP (NestJS RPC)**

Used for services that expose **NestJS microservice message patterns**:

**Services**: Payments, Notifications, AI Service, Availability

**Example - Payments**
**File**: [api-gateway/src/gateway/payments.gateway.controller.ts](TEM-DDC/api-gateway/src/gateway/payments.gateway.controller.ts)

```typescript
@Controller('payments')
export class PaymentsGatewayController {
  private readonly paymentsClient: ClientProxy;

  constructor(private readonly config: ConfigService) {
    // Connect to Payments microservice via TCP
    this.paymentsClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { 
        host: config.get<string>('PAYMENTS_SERVICE_HOST') || 'localhost',
        port: config.get<number>('PAYMENTS_SERVICE_PORT') || 4007,
      },
    });
  }

  @Post(':paymentId/initiate')
  @UseGuards(JwtPatientGuard)
  async initiatePayment(@Param('paymentId') paymentId: string) {
    try {
      // Send RPC message pattern to microservice
      return await firstValueFrom(
        this.paymentsClient.send('initiate_payment', { paymentId }),
      );
    } catch (e: any) {
      throw new HttpException(e?.message || 'Payment failed', e?.status || 500);
    }
  }
}
```

**Microservice Listening**
**File**: [ms-payments/src/payments/payments.controller.ts](TEM-DDC/ms-payments/src/payments/payments.controller.ts)

```typescript
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Message pattern listener
  @MessagePattern('initiate_payment')
  initiatePayment(@Payload() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(dto.paymentId);
  }

  @MessagePattern('verify_payment')
  verifyPayment(@Payload() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto.paymentRef);
  }
}
```

**TCP Service Setup**
**File**: [ms-payments/src/main.ts](TEM-DDC/ms-payments/src/main.ts)

```typescript
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 4007,  // Listening on TCP port
      },
    },
  );
  await app.listen();
  console.log('🚀 Payments microservice listening on port 4007');
}
```

**Environment Configuration**:
```env
PAYMENTS_SERVICE_HOST=localhost
PAYMENTS_SERVICE_PORT=4007

NOTIFICATIONS_SERVICE_HOST=localhost
NOTIFICATIONS_SERVICE_PORT=4008

AI_SERVICE_HOST=localhost
AI_SERVICE_PORT=4010
```

---

## 3. Microservices → Microservices Communication

Microservices communicate with **each other using TCP RPC** (same as gateway to microservices).

### **Example: Payments → Notifications**

**File**: [ms-payments/src/payments/payments.module.ts](TEM-DDC/ms-payments/src/payments/payments.module.ts)

```typescript
@Module({
  imports: [
    ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: process.env.NOTIFICATIONS_SERVICE_HOST || 'localhost',
        port: process.env.NOTIFICATIONS_SERVICE_PORT || 4008,
      },
    }),
  ],
  providers: [
    {
      provide: 'NOTIFICATIONS_SERVICE',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: 'localhost',
            port: 4008,
          },
        }),
    },
  ],
})
export class PaymentsModule {}
```

**Sending Message**
**File**: [ms-payments/src/payments/payments.service.ts](TEM-DDC/ms-payments/src/payments/payments.service.ts)

```typescript
@Injectable()
export class PaymentsService {
  constructor(
    @Inject('NOTIFICATIONS_SERVICE')
    private readonly notificationsClient: ClientProxy,
  ) {}

  async refundPayment(paymentId: string) {
    const payment = await this.repo.findOne({ where: { id: paymentId } });
    
    // Call notification service
    await firstValueFrom(
      this.notificationsClient.send('create_notification', {
        userId: payment.patientId,
        type: 'PAYMENT_REFUNDED',
        message: `Refund processed for payment ${paymentId}`,
      }),
    );
    
    payment.status = PaymentStatus.REFUNDED;
    return this.repo.save(payment);
  }
}
```

### **Example: Rendezvous → Payments**

**File**: [ms-rendez-vous/src/rendezvous/rendezvous.service.ts](TEM-DDC/ms-rendez-vous/src/rendezvous/rendezvous.service.ts)

```typescript
@Injectable()
export class RendezvousService {
  constructor(
    @Inject('PAYMENTS_SERVICE')
    private readonly paymentsClient: ClientProxy,
  ) {}

  async create(dto: CreateRendezvousDto): Promise<Rendezvous> {
    const rendezvous = this.repo.create(dto);
    const saved = await this.repo.save(rendezvous);

    // Create associated payment
    await firstValueFrom(
      this.paymentsClient.send('create_payment', {
        rendezvousId: saved.id,
        patientId: dto.patientId,
        amount: 50,  // Appointment fee
      }),
    );

    return saved;
  }
}
```

### **Example: Video Consultation → Medical Records & Notifications**

**File**: [ms-video-consultation/src/consultation/consultation.service.ts](TEM-DDC/ms-video-consultation/src/consultation/consultation.service.ts)

```typescript
@Injectable()
export class ConsultationService {
  constructor(
    @Inject('NOTIFICATIONS_SERVICE')
    private readonly notificationsClient: ClientProxy,
    @Inject('MEDICAL_RECORDS_SERVICE')
    private readonly medicalRecordsClient: ClientProxy,
  ) {}

  async endConsultation(consultationId: string) {
    const consultation = await this.consultationRepo.findOne(consultationId);
    consultation.status = ConsultationStatus.COMPLETED;
    
    // Notify both parties
    await firstValueFrom(
      this.notificationsClient.send('create_notification', {
        userId: consultation.doctorId,
        type: 'CONSULTATION_ENDED',
        message: 'Consultation completed',
      }),
    );

    // Medical records microservice will handle archiving
    await firstValueFrom(
      this.medicalRecordsClient.send('archive_consultation', {
        consultationId,
      }),
    );

    return this.consultationRepo.save(consultation);
  }
}
```

---

## 4. External Service Integration

### **Ollama AI Service** (HTTP)

**File**: [ms-ai/src/ai/ai.service.ts](TEM-DDC/ms-ai/src/ai/ai.service.ts)

```typescript
@Injectable()
export class AiService {
  private readonly ollamaHost: string = 'http://localhost:11434';

  async summarizeMedicalRecords(records: any[]) {
    const response = await fetch(`${this.ollamaHost}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1',
        prompt: medicalPrompt,
        stream: false,
      }),
    });
    
    const data = await response.json();
    return { summary: data.response };
  }
}
```

---

## 5. Complete Message Flow: Booking Appointment

```
User (Frontend)
    │
    ├─► POST /api/rendezvous
    │   ↓
Gateway Controller (HTTP)
    │
    ├─► Forward to ms-rendezvous
    │   (HTTP: http://localhost:3010/rendezvous)
    │   ↓
ms-Rendezvous
    │
    ├─► Validate availability (HTTP call to ms-availability)
    │
    ├─► RPC: Mark time slot unavailable
    │
    ├─► RPC: Create Payment (TCP to Payments Service)
    │   ↓
ms-Payments
    │
    └─► RPC: Send notification (TCP to Notifications Service)
        ↓
ms-Notifications
    │
    └─► Store + Emit to frontend (WebSocket or polling)

Response chain: Notifications → Payments → Rendezvous → Gateway → Frontend
```

---

## 6. Service Ports & Configuration

| Service | Port | Protocol | Type |
|---------|------|----------|------|
| API Gateway | 3045 | HTTP | REST |
| Messages MS | 3060 | HTTP | REST |
| Rendezvous MS | 3010 | HTTP | REST |
| Video Consultation MS | 3020 | HTTP | REST |
| Medical Records MS | 3030 | HTTP | REST |
| Availability MS | 2025 | HTTP | REST |
| Patients MS | 3001 | HTTP | REST |
| Doctors MS | 3002 | HTTP | REST |
| Login Patient MS | 3003 | HTTP | REST |
| Payments MS | 4007 | TCP | RPC |
| Notifications MS | 4008 | TCP | RPC |
| AI Service | 4010 | TCP | RPC |
| Disponibility MS | 4011 | TCP | RPC |

---

## 7. Error Handling Flow

**Gateway catches all errors and normalizes response**:

```typescript
private handleAxiosError(e: unknown): never {
  const err = e as AxiosError<any>;
  const status = err?.response?.status ?? 502;
  const data = err?.response?.data;
  
  const message = 
    (typeof data?.message === 'string' && data.message) ||
    err?.message || 
    'Service error';

  throw new HttpException({ message }, status);
}
```

---

## 8. Authentication Flow

1. **Frontend sends credentials** → Gateway `/auth/login`
2. **Gateway forwards** → MS (ms-loginpatient or ms-logindoctor)
3. **MS validates** → Returns JWT token
4. **Gateway sets** → HTTP-Only cookie + returns token in response
5. **Frontend stores** → localStorage (for subsequent requests)
6. **Guard verification** → `@UseGuards(JwtPatientGuard)` on each route

---

## Summary Table

| Layer | Technology | Protocol | Direction | Example |
|-------|-----------|----------|-----------|---------|
| **Frontend → Gateway** | Axios | HTTP/REST | Sync | POST /api/rendezvous |
| **Gateway → HTTP Services** | HttpService | HTTP/REST | Sync | GET /messages/conversations |
| **Gateway → TCP Services** | ClientProxy | TCP | Async-RPC | send('create_payment', {...}) |
| **Microservices Intercom** | ClientProxy | TCP | Async-RPC | Rendezvous → Payments |
| **External APIs** | Native Fetch | HTTP/REST | Sync | Ollama AI service |
