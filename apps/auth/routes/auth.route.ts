import {Router } from 'express';

import { loginController , logoutController , updateUserPayment , deleteAccountController } from '../controllers/auth.controller';


const router = Router();

router.post('/login', loginController);
router.get('/logout', logoutController);
router.post('/updatePayment' , updateUserPayment);
router.delete('/account', deleteAccountController);
export default router;
