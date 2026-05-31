declare module 'bcryptjs' {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hashSync(data: string, saltOrRounds: string | number): string;
  export function compareSync(data: string, encrypted: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}

declare module 'morgan' {
  import { RequestHandler } from 'express';
  function morgan(format: string, options?: any): RequestHandler;
  export = morgan;
}
