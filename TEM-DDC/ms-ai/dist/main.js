"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const microservices_1 = require("@nestjs/microservices");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const logger = new common_1.Logger('Main');
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4010;
    const app = await core_1.NestFactory.createMicroservice(app_module_1.AppModule, {
        transport: microservices_1.Transport.TCP,
        options: {
            host: '0.0.0.0',
            port: port,
        },
    });
    const tcpServer = app.server?.server;
    if (tcpServer && typeof tcpServer.setTimeout === 'function') {
        tcpServer.setTimeout(120000);
    }
    await app.listen();
    logger.log(`ms-ai microservice is listening on TCP port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map