import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @MaxLength(4000, { message: 'Message cannot exceed 4000 characters' })
  content: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class GetMessagesQueryDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;

  @IsString()
  @IsOptional()
  cursor?: string;
}
