create extension if not exists "uuid-ossp";

create table users (
                       id uuid primary key,
                       email varchar(255) not null unique,
                       password_hash varchar(255) not null,
                       created_at timestamptz not null default now()
);

create table categories (
                            id uuid primary key,
                            user_id uuid not null references users(id) on delete cascade,
                            name varchar(80) not null,
                            color varchar(16) not null,
                            icon varchar(50) not null,
                            budget_limit numeric(12,2),
                            created_at timestamptz not null default now(),
                            constraint uq_category_user_name unique (user_id, name)
);

create table expenses (
                          id uuid primary key,
                          user_id uuid not null references users(id) on delete cascade,
                          category_id uuid not null references categories(id),
                          amount numeric(12,2) not null,
                          currency varchar(8) not null default 'EUR',
                          expense_date date not null,
                          merchant varchar(120),
                          note text,
                          created_at timestamptz not null default now(),
                          updated_at timestamptz not null default now()
);

create index idx_expenses_user_date on expenses(user_id, expense_date desc);
create index idx_expenses_user_category on expenses(user_id, category_id);
