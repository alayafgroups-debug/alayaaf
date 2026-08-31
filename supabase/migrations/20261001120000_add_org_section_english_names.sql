alter table public.org_sections
  add column if not exists name_en text not null default '';

update public.org_sections
set name_en = case trim(name)
  when 'أكادمية وعد' then 'Waad Academy'
  when 'الموارد البشرية' then 'Human Resources'
  when 'شركة العياف التجارية للدعاية والاعلان' then 'Al Ayaf Advertising Company'
  when 'شركة الميس' then 'Al Mais Company'
  when 'شركة بيبسي' then 'Pepsi Company'
  when 'فندق اعمار الضيافة' then 'Emaar Al Diyafa Hotel'
  when 'فندق باب الملتزم' then 'Bab Al Multazam Hotel'
  when 'فندق بارك ان' then 'Park Inn Hotel'
  when 'فندق جبل عمر روتانا' then 'Jabal Omar Rotana Hotel'
  when 'فندق روزوود' then 'Rosewood Hotel'
  when 'فندق مكارم أم القرى' then 'Makarem Umm Al Qura Hotel'
  when 'فندق منى كنكورد' then 'Mina Concorde Hotel'
  when 'قسم البرمجيات' then 'Software Department'
  when 'قسم الدعم الفني' then 'Technical Support Department'
  when 'مدارس الأندلس أبحر' then 'Al Andalus Schools - Obhur'
  when 'مدارس الأندلس الفيحاء' then 'Al Andalus Schools - Al Fayha'
  when 'مدارس الأندلس المنار' then 'Al Andalus Schools - Al Manar'
  when 'مدارس دار الذكر' then 'Dar Al Thikr Schools'
  when 'مدارس دار الذكر (بلوم)' then 'Dar Al Thikr Schools (Bloom)'
  when 'مطعم أغافي' then 'Agave Restaurant'
  else name_en
end
where trim(coalesce(name_en, '')) = '';
