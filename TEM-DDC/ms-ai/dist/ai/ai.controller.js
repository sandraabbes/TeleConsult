"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const ai_service_1 = require("./ai.service");
let AiController = AiController_1 = class AiController {
    aiService;
    logger = new common_1.Logger(AiController_1.name);
    constructor(aiService) {
        this.aiService = aiService;
    }
    async summarizeMedicalRecords(data) {
        try {
            this.logger.log(`Received request to summarize ${data.records?.length || 0} medical records`);
            return await this.aiService.summarizeMedicalRecords(data.records || []);
        }
        catch (error) {
            this.logger.error(`Error summarizing medical records: ${error.message}`, error.stack);
            return { summary: "Erreur lors de la génération du résumé." };
        }
    }
    async summarizeSingleRecord(data) {
        try {
            this.logger.log(`Received request to summarize a single record`);
            return await this.aiService.summarizeSingleRecord(data.record);
        }
        catch (error) {
            this.logger.error(`Error summarizing single record: ${error.message}`, error.stack);
            return { summary: "Erreur lors de la génération du résumé." };
        }
    }
};
exports.AiController = AiController;
__decorate([
    (0, microservices_1.MessagePattern)('summarize_medical_records'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "summarizeMedicalRecords", null);
__decorate([
    (0, microservices_1.MessagePattern)('summarize_single_record'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "summarizeSingleRecord", null);
exports.AiController = AiController = AiController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map