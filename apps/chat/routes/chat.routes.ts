import {Router} from 'express';

const router = Router();

import { createConversation, getConversations, updateConversation , saveMessage , getMessages , deleteConversation } from '../controllers/chat.controller';


router.post('/conversation', createConversation);
router.get('/conversations', getConversations);
router.put('/conversation', updateConversation);
router.delete('/conversation', deleteConversation);
router.post('/message', saveMessage);
router.get('/messages', getMessages);

export default router;