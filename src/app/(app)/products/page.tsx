import { getCurrentUser } from "@/server/current-user";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/server/serialize";
import { ProductsManager } from "./products-manager";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  const products = await prisma.product.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });
  return <ProductsManager products={products.map(serializeProduct)} />;
}
