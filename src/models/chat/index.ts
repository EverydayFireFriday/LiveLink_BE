export { ChatRoom, ChatRoomModel } from './chatRoom';
export { Message, MessageModel } from './message';
import logger from '../../utils/logger/logger';

export function initializeChatModels() {
  logger.info('✅ Chat models initialized');
}
