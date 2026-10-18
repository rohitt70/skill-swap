import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Recipient ID is required' })
  recipientId: string;

  @IsString()
  @IsOptional()
  note?: string;
}
