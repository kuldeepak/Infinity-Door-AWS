CREATE TABLE `SavedCart` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'Not recovered',
    `customerName` VARCHAR(255) NULL,
    `customerEmail` VARCHAR(255) NULL,
    `region` VARCHAR(255) NULL,
    `subtotal` INTEGER NOT NULL DEFAULT 0,
    `total` INTEGER NOT NULL DEFAULT 0,
    `cartJson` LONGTEXT NOT NULL,
    `recoveredOrderId` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
);

CREATE TABLE `SavedCartItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `savedCartId` INTEGER NOT NULL,
    `productId` VARCHAR(255) NULL,
    `variantId` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `variantTitle` VARCHAR(255) NULL,
    `sku` VARCHAR(255) NULL,
    `quantity` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `propertiesJson` LONGTEXT NULL,
    `imageUrl` TEXT NULL,

    PRIMARY KEY (`id`)
);

CREATE TABLE `MerchantStorefrontSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
);

CREATE UNIQUE INDEX `SavedCart_token_key` ON `SavedCart`(`token`);
CREATE INDEX `SavedCart_shop_createdAt_idx` ON `SavedCart`(`shop`, `createdAt`);
CREATE INDEX `SavedCart_shop_status_idx` ON `SavedCart`(`shop`, `status`);
CREATE INDEX `SavedCartItem_savedCartId_idx` ON `SavedCartItem`(`savedCartId`);
CREATE INDEX `SavedCartItem_variantId_idx` ON `SavedCartItem`(`variantId`);
CREATE UNIQUE INDEX `MerchantStorefrontSession_token_key` ON `MerchantStorefrontSession`(`token`);
CREATE INDEX `MerchantStorefrontSession_shop_expiresAt_idx` ON `MerchantStorefrontSession`(`shop`, `expiresAt`);

ALTER TABLE `SavedCartItem` ADD CONSTRAINT `SavedCartItem_savedCartId_fkey` FOREIGN KEY (`savedCartId`) REFERENCES `SavedCart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;