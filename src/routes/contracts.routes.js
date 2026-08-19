import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { 
  listContracts, 
  getMyContracts, 
  getContract, 
  createContract,
  createManualContract,
  updateContract, 
  deleteContract, 
  completeContract,
  activateContract,
  cancelContract,
  acquireContractLock,
  releaseContractLock,
  confirmContractDeposit,
} from '../controllers/contracts.controller.js';

const r = Router();
r.get('/contracts', requireAuth, requireRole('ADMIN'), listContracts); // admin sees all with filtering
r.get('/contracts/my', requireAuth, getMyContracts);                   // user sees their own
r.post('/contracts/manual', requireAuth, requireRole('ADMIN'), createManualContract);
r.get('/contracts/:id', requireAuth, getContract);                     // owner or admin
r.post('/contracts', requireAuth, createContract);                     // user creates
r.put('/contracts/:id', requireAuth, updateContract);                  // owner or admin updates
r.delete('/contracts/:id', requireAuth, deleteContract);               // owner or admin deletes
r.post('/contracts/:id/complete', requireAuth, completeContract);      // owner or admin completes
r.post('/contracts/:id/activate', requireAuth, requireRole('ADMIN'), activateContract); // admin activates DRAFT
r.post('/contracts/:id/confirm-deposit', requireAuth, requireRole('ADMIN'), confirmContractDeposit);
r.post('/contracts/:id/cancel', requireAuth, cancelContract);          // owner or admin cancels
r.post('/contracts/:id/lock', requireAuth, requireRole('ADMIN'), acquireContractLock);
r.delete('/contracts/:id/lock', requireAuth, requireRole('ADMIN'), releaseContractLock);
export default r;
