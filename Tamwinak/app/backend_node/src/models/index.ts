import { User } from './User';
import { Role } from './Role';
import { Store } from './Store';
import { Product } from './Product';
import { Order } from './Order';
import { OrderItem } from './OrderItem';
import { Permission } from './Permission';
import { RolePermission } from './RolePermission';
import { UserRole } from './UserRole';
import { Notification } from './Notification';
import { AuditLog } from './AuditLog';
import { Rating } from './Rating';
import { AppSetting } from './AppSetting';
import { Language } from './Language';
import { Industry } from './Industry';
import { StoreIndustry } from './StoreIndustry';
import { StoreProduct } from './StoreProduct';
import { Unit } from './Unit';
import { ProductUnit } from './ProductUnit';
import { UserAddress } from './UserAddress';
import { Category } from './Category';
import { DeliveryArea } from './DeliveryArea';
import { StoreGroup } from './StoreGroup';
import { ProductCustomizationStage } from './ProductCustomizationStage';
import { ProductCustomizationOption } from './ProductCustomizationOption';

// Associations

// Order <-> OrderItem associations
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

// Order associations with Store and User
Order.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Store.hasMany(Order, { foreignKey: 'store_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Order, { foreignKey: 'user_id', as: 'userOrders' });

// Role <-> Permission associations
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', as: 'roles' });

// User <-> Role associations
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', as: 'users' });

// Store <-> Industry (many-to-many)
Store.belongsToMany(Industry, { through: StoreIndustry, foreignKey: 'store_id', as: 'industries' });
Industry.belongsToMany(Store, { through: StoreIndustry, foreignKey: 'industry_id', as: 'stores' });

// Product <-> Industry (many-to-one, product belongs to industry)
Industry.hasMany(Product, { foreignKey: 'industry_id', as: 'products' });
Product.belongsTo(Industry, { foreignKey: 'industry_id', as: 'industry' });

// Store <-> Product (many-to-many via store_products)
Store.belongsToMany(Product, { through: StoreProduct, foreignKey: 'store_id', as: 'products' });
Product.belongsToMany(Store, { through: StoreProduct, foreignKey: 'product_id', as: 'stores' });

// StoreProduct direct associations (for distribution service joins)
StoreProduct.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Store.hasMany(StoreProduct, { foreignKey: 'store_id', as: 'storeProducts' });
StoreProduct.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(StoreProduct, { foreignKey: 'product_id', as: 'store_mappings' });

// Product <-> Unit (many-to-many for multiple unit pricing)
Product.belongsToMany(Unit, { through: ProductUnit, foreignKey: 'product_id', as: 'units' });
Unit.belongsToMany(Product, { through: ProductUnit, foreignKey: 'unit_id', as: 'products' });
Product.hasMany(ProductUnit, { foreignKey: 'product_id', as: 'product_units' });
ProductUnit.belongsTo(Product, { foreignKey: 'product_id' });
Unit.hasMany(ProductUnit, { foreignKey: 'unit_id', as: 'unit_details' });
ProductUnit.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' });

// User <-> UserAddress
User.hasMany(UserAddress, { foreignKey: 'user_id', as: 'addresses' });
UserAddress.belongsTo(User, { foreignKey: 'user_id' });

// Product <-> Category (many-to-one)
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category_obj' });

// Store <-> DeliveryArea (one-to-many)
Store.hasMany(DeliveryArea, { foreignKey: 'store_id', as: 'deliveryAreas' });
DeliveryArea.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

// Store <-> StoreGroup (many-to-one)
StoreGroup.hasMany(Store, { foreignKey: 'group_id', as: 'stores' });
Store.belongsTo(StoreGroup, { foreignKey: 'group_id', as: 'group' });

// Customization associations
Product.hasMany(ProductCustomizationStage, { foreignKey: 'product_id', as: 'customization_stages' });
ProductCustomizationStage.belongsTo(Product, { foreignKey: 'product_id' });

ProductCustomizationStage.hasMany(ProductCustomizationOption, { foreignKey: 'stage_id', as: 'options' });
ProductCustomizationOption.belongsTo(ProductCustomizationStage, { foreignKey: 'stage_id' });


export {
    User, Role, Store, Product, Order, OrderItem,
    Permission, RolePermission, UserRole, Notification,
    AuditLog, Rating, AppSetting, Language,
    Industry, StoreIndustry, StoreProduct,
    Unit, ProductUnit, UserAddress, Category, DeliveryArea, StoreGroup,
    ProductCustomizationStage, ProductCustomizationOption
};
