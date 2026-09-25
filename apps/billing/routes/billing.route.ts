import {Router} from 'express';

import { createOrder , verifyPayment } from '../controllers/billing.controller';

const router = Router();

router.post('/createOrder', createOrder);
router.post('/verifyPayment', verifyPayment);

export default router;