import {Router } from 'express';

import { loginController , logoutController } from '../controllers/auth.controller';

const router = Router();

router.post('/login', loginController);
router.get('/logout', logoutController);
export default router;
