import type { InjectionKey } from 'vue'
import type { SessionOptions } from './session'

export const SESSION_OPTIONS: InjectionKey<SessionOptions> = Symbol('session-options')
