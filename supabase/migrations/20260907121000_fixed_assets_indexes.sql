create index if not exists fixed_assets_credit_account_idx
  on public.fixed_assets(acquisition_credit_account_code);
create index if not exists fixed_asset_disposals_proceeds_account_idx
  on public.fixed_asset_disposals(proceeds_account_code);
create index if not exists fixed_asset_disposals_gain_loss_account_idx
  on public.fixed_asset_disposals(gain_loss_account_code);
