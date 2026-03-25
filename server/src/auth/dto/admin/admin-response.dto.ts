import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Admin login successful',
  })
  message: string;

  @ApiProperty({
    description: 'Admin details',
    example: { id: 'cuid...', email: 'admin@portfolio.dev' },
  })
  admin: { id: string; email: string };
}

export class AdminSetupResponseDto {
  @ApiProperty({
    description: 'Setup successful message',
    example: 'Admin account setup correctly',
  })
  message: string;

  @ApiProperty({
    description: 'Admin details',
    example: { id: 'cuid...', email: 'admin@portfolio.dev' },
  })
  admin: { id: string; email: string };
}
