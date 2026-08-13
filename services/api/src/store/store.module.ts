import { Global, Module } from '@nestjs/common';
import { DataStore } from './data.store';

@Global()
@Module({
  providers: [DataStore],
  exports: [DataStore],
})
export class StoreModule {}
