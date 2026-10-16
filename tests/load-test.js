import http from 'k6/http';
import { check, sleep } from 'k6';

// Put a real pre-generated patient JWT here
const TOKEN = 'patinet-jwt-token';  // Replace with a valid JWT token for the patient
const DOCTOR_ID = 2;
const PATIENT_ID = 'patient id';  // Extracted from JWT token

export const options = {
  stages: [
    { duration: '60s', target: 50 },   // Phase 1: ramp up
    { duration: '180s', target: 50 },  // Phase 2: sustained load
    { duration: '60s', target: 0 },    // Phase 3: ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% under 200ms
    http_req_failed: ['rate<0.01'],    // less than 1% errors
  },
};

export default function () {
  // Vary the appointment time for each iteration AND each VU to avoid conflicts
  const baseDate = new Date('2027-12-15T09:00:00Z');  // Use future date to avoid conflicts with previous runs
  // Use both VU ID and iteration number to create unique time slots
  const minutesOffset = (__VU * 10000 + __ITER) * 30; // Each VU gets unique range
  const appointmentTime = new Date(baseDate.getTime() + minutesOffset * 60 * 1000);
  
  const startTime = appointmentTime.toISOString();
  const endTime = new Date(appointmentTime.getTime() + 30 * 60 * 1000).toISOString();

  const payload = JSON.stringify({
    medecinId: DOCTOR_ID,
    patientId: PATIENT_ID,
    startTime: startTime,
    endTime: endTime,
    type: 'standard',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
  };

  const res = http.post('http://localhost:3005/rendezvous', payload, params);

  // Log first few responses to see what's failing
  if (__VU === 1 && __ITER < 3) {
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${res.body}`);
  }

  check(res, {
    'status is 201': (r) => r.status === 201,
    'has appointment id': (r) => JSON.parse(r.body).id !== undefined,
  });

  sleep(1);
}