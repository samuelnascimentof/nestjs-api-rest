import { Injectable } from '@nestjs/common';
import { CreateStockOutputDto } from './dto/create-stock-output.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundError } from 'src/errors';

@Injectable()
export class StockOutputsService {
  constructor(private prismaService: PrismaService) {}

  async create(createStockOutputDto: CreateStockOutputDto) {
    const product = await this.prismaService.product.findUnique({
      where: { id: createStockOutputDto.product_id },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.quantity === 0) {
      throw new Error('Product out of stock');
    }

    if (createStockOutputDto.quantity > product.quantity) {
      throw new Error('Insufficient product quantity');
    }

    // Padrão -> auto commit

    // Persiste o estoque de entrada no banco de dados
    // Atualiza a quantidade do produto
    // Retorno: Array com todos os resultados das operações
    const result = await this.prismaService.$transaction([
      this.prismaService.stockOutput.create({
        data: {
          productId: createStockOutputDto.product_id,
          quantity: createStockOutputDto.quantity,
          date: createStockOutputDto.date,
        },
      }),
      // TODO: Implementar lock row para atualização de estoque
      this.prismaService.product.update({
        where: { id: createStockOutputDto.product_id },
        data: {
          quantity: {
            decrement: createStockOutputDto.quantity,
          },
        },
      }),
    ]);

    return result[0];
  }

  findAll() {
    return this.prismaService.stockOutput.findMany();
  }

  async findOne(id: number) {
    try {
      return await this.prismaService.stockOutput.findUniqueOrThrow({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Stock output with id ${id} not found`);
      }
      throw error;
    }
  }
}
