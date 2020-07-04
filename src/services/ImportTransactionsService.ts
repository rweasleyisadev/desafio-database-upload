import fs from 'fs';
import csvParse from 'csv-parse';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const contactsReadStream = fs.createReadStream(filePath);
    const parses = csvParse({
      from_line: 2,
    });
    const parseCsv = contactsReadStream.pipe(parses);
    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];
    parseCsv.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value || !category) return;
      transactions.push({
        title,
        type,
        value,
        category,
      });
      categories.push(category);
    });
    await new Promise(resolve => parseCsv.on('end', resolve));
    const existentCategories = await categoryRepository.find({
      where: { title: In(categories) },
    });
    const existentCategoriesTitles = existentCategories.map(cat => cat.title);
    const addCategoryTitles = categories
      .filter(cat => !existentCategoriesTitles.includes(cat))
      .filter((value, index, self) => self.indexOf(value) === index);
    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );
    await categoryRepository.save(newCategories);
    const finalCategories = [...newCategories, ...existentCategories];
    const createdTransactions = transactionsRepository.create(
      transactions.map(t => ({
        title: t.title,
        type: t.type,
        value: t.value,
        category: finalCategories.find(c => c.title === t.category),
      })),
    );
    await transactionsRepository.save(createdTransactions);
    await fs.promises.unlink(filePath);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
