-- public._prisma_migrations definition

-- Drop table

-- DROP TABLE public._prisma_migrations;

CREATE TABLE public._prisma_migrations (
	id varchar(36) NOT NULL,
	checksum varchar(64) NOT NULL,
	finished_at timestamptz NULL,
	migration_name varchar(255) NOT NULL,
	logs text NULL,
	rolled_back_at timestamptz NULL,
	started_at timestamptz DEFAULT now() NOT NULL,
	applied_steps_count int4 DEFAULT 0 NOT NULL,
	CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id)
);


-- public.clients definition

-- Drop table

-- DROP TABLE public.clients;

CREATE TABLE public.clients (
	id serial4 NOT NULL,
	"name" text NOT NULL,
	origin_id text NULL,
	CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX clients_origin_id_key ON public.clients USING btree (origin_id);


-- public.customers definition

-- Drop table

-- DROP TABLE public.customers;

CREATE TABLE public.customers (
	id serial4 NOT NULL,
	"name" text NULL,
	origin_id text NULL,
	phone text NULL,
	email text NULL,
	im_origin_id text NULL,
	CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX customers_im_origin_id_key ON public.customers USING btree (im_origin_id);
CREATE UNIQUE INDEX customers_origin_id_key ON public.customers USING btree (origin_id);


-- public.logistic definition

-- Drop table

-- DROP TABLE public.logistic;

CREATE TABLE public.logistic (
	id serial4 NOT NULL,
	"name" text NULL,
	"type" text NULL,
	CONSTRAINT logistic_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX logistic_name_key ON public.logistic USING btree (name);


-- public.omnicrm definition

-- Drop table

-- DROP TABLE public.omnicrm;

CREATE TABLE public.omnicrm (
	id serial4 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text NULL,
	"type" text NULL,
	CONSTRAINT omnicrm_pkey PRIMARY KEY (id)
);


-- public.zdconnector definition

-- Drop table

-- DROP TABLE public.zdconnector;

CREATE TABLE public.zdconnector (
	id serial4 NOT NULL,
	"name" text NOT NULL,
	host text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"suncoAppId" text NOT NULL,
	"suncoAppKey" text NOT NULL,
	"suncoAppSecret" text NOT NULL,
	"zdAPIToken" text NOT NULL,
	resource text NULL,
	"clientsId" int4 NULL,
	CONSTRAINT zdconnector_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX zdconnector_host_key ON public.zdconnector USING btree (host);


-- public.channel definition

-- Drop table

-- DROP TABLE public.channel;

CREATE TABLE public.channel (
	id serial4 NOT NULL,
	"name" text NULL,
	"clientsId" int4 NULL,
	CONSTRAINT channel_pkey PRIMARY KEY (id),
	CONSTRAINT "channel_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES public.clients(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX channel_name_key ON public.channel USING btree (name);


-- public.integration definition

-- Drop table

-- DROP TABLE public.integration;

CREATE TABLE public.integration (
	id serial4 NOT NULL,
	"name" text NULL,
	"baseUrl" text NULL,
	f_chat bool NULL,
	f_review bool NULL,
	f_cancel bool NULL,
	f_rr bool NULL,
	"clientsId" int4 NULL,
	notes text NULL,
	status text NULL,
	CONSTRAINT integration_pkey PRIMARY KEY (id),
	CONSTRAINT "integration_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES public.clients(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "integration_baseUrl_key" ON public.integration USING btree ("baseUrl");


-- public.store definition

-- Drop table

-- DROP TABLE public.store;

CREATE TABLE public.store (
	id serial4 NOT NULL,
	"name" text NULL,
	origin_id text NULL,
	"channelId" int4 NULL,
	refresh_token text NULL,
	"token" text NULL,
	secondary_refresh_token text NULL,
	secondary_token text NULL,
	url text NULL,
	status text NULL,
	CONSTRAINT store_pkey PRIMARY KEY (id),
	CONSTRAINT "store_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX store_origin_id_key ON public.store USING btree (origin_id);


-- public.credent definition

-- Drop table

-- DROP TABLE public.credent;

CREATE TABLE public.credent (
	id serial4 NOT NULL,
	"key" text NULL,
	value text NULL,
	"integrationId" int4 NULL,
	CONSTRAINT credent_pkey PRIMARY KEY (id),
	CONSTRAINT "credent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES public.integration(id) ON DELETE SET NULL ON UPDATE CASCADE
);


-- public.omnichat definition

-- Drop table

-- DROP TABLE public.omnichat;

CREATE TABLE public.omnichat (
	id serial4 NOT NULL,
	origin_id text NULL,
	last_message text NOT NULL,
	"last_messageId" text NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"storeId" int4 NULL,
	"externalId" text NULL,
	"customersId" int4 NULL,
	CONSTRAINT omnichat_pkey PRIMARY KEY (id),
	CONSTRAINT "omnichat_customersId_fkey" FOREIGN KEY ("customersId") REFERENCES public.customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "omnichat_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES public.store(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX omnichat_origin_id_key ON public.omnichat USING btree (origin_id);


-- public.omnichat_line definition

-- Drop table

-- DROP TABLE public.omnichat_line;

CREATE TABLE public.omnichat_line (
	id serial4 NOT NULL,
	origin_id text NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	line_text text NOT NULL,
	"omnichatId" int4 NULL,
	author text NULL,
	chat_type text NULL,
	CONSTRAINT omnichat_line_pkey PRIMARY KEY (id),
	CONSTRAINT "omnichat_line_omnichatId_fkey" FOREIGN KEY ("omnichatId") REFERENCES public.omnichat(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX omnichat_line_origin_id_key ON public.omnichat_line USING btree (origin_id);


-- public.orders definition

-- Drop table

-- DROP TABLE public.orders;

CREATE TABLE public.orders (
	id serial4 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	status text NULL,
	shop_id text NULL,
	payment_id text NULL,
	temp_id text NULL,
	origin_id text NULL,
	package_id text NULL,
	invoice text NULL,
	recp_name text NULL,
	recp_phone text NULL,
	recp_addr_full text NULL,
	recp_addr_district text NULL,
	recp_addr_city text NULL,
	recp_addr_province text NULL,
	recp_addr_country text NULL,
	recp_addr_postal_code text NULL,
	recp_addr_district_id text NULL,
	recp_addr_city_id text NULL,
	tracking_number text NULL,
	ship_document_url text NULL,
	recp_addr_province_id text NULL,
	recp_addr_geo text NULL,
	logistic_service text NULL,
	"origin_createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	accept_partial bool NULL,
	device text NULL,
	"storeId" int4 NULL,
	"customersId" int4 NULL,
	"logisticId" int4 NULL,
	total_product_price int4 NULL,
	shipping_price int4 NULL,
	total_amount int4 NULL,
	"updatedAt" timestamp(3) NOT NULL,
	buyer_service_fee int4 NULL,
	handling_fee int4 NULL,
	item_insurance_fee int4 NULL,
	platform_discount int4 NULL,
	seller_discount int4 NULL,
	shipping_insurance_fee int4 NULL,
	shipping_platform_discount int4 NULL,
	shipping_seller_discount int4 NULL,
	CONSTRAINT orders_pkey PRIMARY KEY (id),
	CONSTRAINT "orders_customersId_fkey" FOREIGN KEY ("customersId") REFERENCES public.customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "orders_logisticId_fkey" FOREIGN KEY ("logisticId") REFERENCES public.logistic(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES public.store(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX orders_origin_id_key ON public.orders USING btree (origin_id);


-- public.products definition

-- Drop table

-- DROP TABLE public.products;

CREATE TABLE public.products (
	id serial4 NOT NULL,
	origin_id text NULL,
	status text NULL,
	"name" text NULL,
	"condition" int4 NULL,
	"desc" text NULL,
	category int4 NULL,
	price int4 NULL,
	currency text NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	weight int4 NULL,
	stock int4 NULL,
	sku text NULL,
	"storeId" int4 NULL,
	url text NULL,
	pre_order bool NULL,
	CONSTRAINT products_pkey PRIMARY KEY (id),
	CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES public.store(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX products_origin_id_key ON public.products USING btree (origin_id);


-- public.products_img definition

-- Drop table

-- DROP TABLE public.products_img;

CREATE TABLE public.products_img (
	id serial4 NOT NULL,
	origin_id text NULL,
	filename text NULL,
	status text NULL,
	width int4 NULL,
	height int4 NULL,
	"originalUrl" text NULL,
	"thumbnailUrl" text NULL,
	"productsId" int4 NULL,
	CONSTRAINT products_img_pkey PRIMARY KEY (id),
	CONSTRAINT "products_img_productsId_fkey" FOREIGN KEY ("productsId") REFERENCES public.products(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX products_img_origin_id_key ON public.products_img USING btree (origin_id);


-- public.return_refund definition

-- Drop table

-- DROP TABLE public.return_refund;

CREATE TABLE public.return_refund (
	id serial4 NOT NULL,
	origin_id text NULL,
	system_status text NULL,
	total_amount int4 NOT NULL,
	return_type text NULL,
	return_reason text NULL,
	"ordersId" int4 NOT NULL,
	status text NULL,
	CONSTRAINT return_refund_pkey PRIMARY KEY (id),
	CONSTRAINT "return_refund_ordersId_fkey" FOREIGN KEY ("ordersId") REFERENCES public.orders(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX return_refund_origin_id_key ON public.return_refund USING btree (origin_id);


-- public.varian definition

-- Drop table

-- DROP TABLE public.varian;

CREATE TABLE public.varian (
	id serial4 NOT NULL,
	origin_id text NULL,
	price int4 NOT NULL,
	"name" text NOT NULL,
	sku text NULL,
	stock int4 NULL,
	status text NULL,
	pre_order bool NULL,
	"productsOriginId" text NOT NULL,
	CONSTRAINT varian_pkey PRIMARY KEY (id),
	CONSTRAINT "varian_productsOriginId_fkey" FOREIGN KEY ("productsOriginId") REFERENCES public.products(origin_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX varian_origin_id_key ON public.varian USING btree (origin_id);


-- public.order_items definition

-- Drop table

-- DROP TABLE public.order_items;

CREATE TABLE public.order_items (
	id serial4 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	qty int4 NOT NULL,
	package_id text NULL,
	invoice text NULL,
	total_price int4 NOT NULL,
	notes text NULL,
	"ordersId" int4 NULL,
	"productsId" int4 NULL,
	origin_id text NULL,
	CONSTRAINT order_items_pkey PRIMARY KEY (id),
	CONSTRAINT "order_items_ordersId_fkey" FOREIGN KEY ("ordersId") REFERENCES public.orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "order_items_productsId_fkey" FOREIGN KEY ("productsId") REFERENCES public.products(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX order_items_origin_id_key ON public.order_items USING btree (origin_id);


-- public.return_line_item definition

-- Drop table

-- DROP TABLE public.return_line_item;

CREATE TABLE public.return_line_item (
	id serial4 NOT NULL,
	origin_id text NULL,
	refund_service_fee int4 NOT NULL,
	currency text NULL,
	refund_subtotal int4 NOT NULL,
	refund_total int4 NOT NULL,
	"return_refundId" int4 NULL,
	"order_itemsOriginId" text DEFAULT '250929R2XCR3QX-801976400'::text NOT NULL,
	CONSTRAINT return_line_item_pkey PRIMARY KEY (id),
	CONSTRAINT "return_line_item_order_itemsOriginId_fkey" FOREIGN KEY ("order_itemsOriginId") REFERENCES public.order_items(origin_id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "return_line_item_return_refundId_fkey" FOREIGN KEY ("return_refundId") REFERENCES public.return_refund(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX return_line_item_origin_id_key ON public.return_line_item USING btree (origin_id);