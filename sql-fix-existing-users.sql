-- إضافة profiles للمستخدمين الموجودين (اللي ما فيهم trigger)
INSERT INTO public.user_profiles (id, role, display_name)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'role', 'teacher') AS role,
  COALESCE(au.raw_user_meta_data->>'display_name', au.email) AS display_name
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = au.id);
