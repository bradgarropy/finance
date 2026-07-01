CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`sort_order` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	CONSTRAINT "accounts_type_check" CHECK("accounts"."type" in ('asset', 'liability')),
	CONSTRAINT "accounts_category_check" CHECK("accounts"."category" in ('cash', 'savings', 'investment', 'retirement', 'mortgage', 'credit'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_name_unique` ON `accounts` (`name`);--> statement-breakpoint
CREATE TABLE `balances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "balances_amount_cents_check" CHECK("balances"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `balances_date_idx` ON `balances` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `balances_account_id_date_unique` ON `balances` (`account_id`,`date`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`checking_baseline_cents` integer NOT NULL,
	`excess_invest_pct` integer NOT NULL,
	`excess_save_pct` integer NOT NULL,
	`default_window` integer NOT NULL,
	CONSTRAINT "settings_id_check" CHECK("settings"."id" = 1),
	CONSTRAINT "settings_checking_baseline_cents_check" CHECK("settings"."checking_baseline_cents" >= 0),
	CONSTRAINT "settings_excess_invest_pct_check" CHECK("settings"."excess_invest_pct" between 0 and 100),
	CONSTRAINT "settings_excess_save_pct_check" CHECK("settings"."excess_save_pct" between 0 and 100),
	CONSTRAINT "settings_excess_split_check" CHECK("settings"."excess_invest_pct" + "settings"."excess_save_pct" = 100),
	CONSTRAINT "settings_default_window_check" CHECK("settings"."default_window" in (4, 12, 26, 52))
);
