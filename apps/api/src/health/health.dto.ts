import { ApiProperty } from '@nestjs/swagger';

export type DependencyStatus = 'up' | 'down';

export class LivenessResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status: 'ok';
}

export class ReadinessChecksDto {
  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  database: DependencyStatus;
}

export class ReadinessResponseDto {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status: 'ok' | 'error';

  @ApiProperty({ type: ReadinessChecksDto })
  checks: ReadinessChecksDto;
}
