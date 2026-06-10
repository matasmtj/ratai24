import prisma from '../models/db.js';
import { conflict, notFound } from '../errors.js';

/** How long an admin edit lock stays valid without refresh. */
export const CONTRACT_LOCK_TTL_MS = 5 * 60 * 1000;

const lockHolderSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
};

export function isContractLockActive(contract) {
  if (!contract?.editLockedByUserId || !contract?.editLockedAt) return false;
  return Date.now() - new Date(contract.editLockedAt).getTime() < CONTRACT_LOCK_TTL_MS;
}

export function getContractLockExpiry(contract) {
  if (!contract?.editLockedAt) return null;
  return new Date(new Date(contract.editLockedAt).getTime() + CONTRACT_LOCK_TTL_MS);
}

export function attachLockMeta(contract) {
  if (!contract) return contract;
  const lockActive = isContractLockActive(contract);
  return {
    ...contract,
    editLockActive: lockActive,
    editLockExpiresAt: lockActive ? getContractLockExpiry(contract) : null,
  };
}

export const contractWithLockInclude = {
  editLockedBy: { select: lockHolderSelect },
};

const sameUserId = (a, b) => Number(a) === Number(b);

export async function acquireContractEditLock(contractId, userId) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: contractWithLockInclude,
  });
  if (!contract) throw notFound('Contract not found');

  if (
    isContractLockActive(contract) &&
    !sameUserId(contract.editLockedByUserId, userId)
  ) {
    throw conflict('This reservation is being edited by another administrator', {
      lockedBy: contract.editLockedBy,
      lockedAt: contract.editLockedAt,
      expiresAt: getContractLockExpiry(contract),
    });
  }

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: {
      editLockedByUserId: userId,
      editLockedAt: new Date(),
    },
    include: contractWithLockInclude,
  });

  return attachLockMeta(updated);
}

export async function releaseContractEditLock(contractId, userId) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw notFound('Contract not found');

  if (!contract.editLockedByUserId) {
    return attachLockMeta(contract);
  }

  if (
    !sameUserId(contract.editLockedByUserId, userId) &&
    isContractLockActive(contract)
  ) {
    throw conflict('Cannot release a lock held by another administrator');
  }

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: {
      editLockedByUserId: null,
      editLockedAt: null,
    },
    include: contractWithLockInclude,
  });

  return attachLockMeta(updated);
}

export async function clearContractEditLock(contractId) {
  await prisma.contract.updateMany({
    where: { id: contractId },
    data: {
      editLockedByUserId: null,
      editLockedAt: null,
    },
  });
}

/** Admin mutations require a valid lock held by the current user. */
export function assertAdminContractEditLock(req, contract) {
  if (!req.user || req.user.role !== 'ADMIN') return;

  if (!isContractLockActive(contract)) {
    throw conflict('Edit lock expired or not held. Open the reservation again to continue.');
  }

  if (!sameUserId(contract.editLockedByUserId, req.user.id)) {
    throw conflict('This reservation is being edited by another administrator', {
      lockedByUserId: contract.editLockedByUserId,
      lockedAt: contract.editLockedAt,
      expiresAt: getContractLockExpiry(contract),
    });
  }
}
