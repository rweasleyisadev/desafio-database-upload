import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepo = getCustomRepository(TransactionRepository);
    const transaction = await transactionsRepo.findOne(id);
    if (!transaction) throw new AppError('nem tem');
    await transactionsRepo.remove(transaction);
  }
}

export default DeleteTransactionService;
