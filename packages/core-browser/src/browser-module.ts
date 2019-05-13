import { BasicModule } from '@ali/ide-core';
import { FunctionComponent } from 'react';

export type SlotMap = Map<string | symbol, FunctionComponent>;

export abstract class BrowserModule extends BasicModule {
  abstract slotMap: SlotMap;
}
