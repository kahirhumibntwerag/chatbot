export interface Message {
  text: string;
  sender: 'user' | 'model';
}