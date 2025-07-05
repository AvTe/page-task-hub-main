# 🧪 How to Run Supabase Tests

## Step 1: Run SQL Tests in Supabase Dashboard

1. **Go to your Supabase dashboard**: `https://supabase.com/dashboard/project/kcldwlpjbbsiourghivq`
2. **Navigate to SQL Editor**
3. **Copy and paste the contents of `supabase-test-queries.sql`**
4. **Click "Run"**
5. **Check all test results show "SUCCESS"**

### Expected Results:
- ✅ TEST 1: Table Creation - SUCCESS (8 tables)
- ✅ TEST 2: RLS Enabled - SUCCESS (8 tables with RLS)
- ✅ TEST 3: RLS Policies - SUCCESS (20+ policies)
- ✅ TEST 4: Custom Types - SUCCESS (5 custom types)
- ✅ TEST 5: Functions - SUCCESS (8+ functions)
- ✅ TEST 6: Triggers - SUCCESS (10+ triggers)
- ✅ TEST 7: Sample Data Test - SUCCESS (RLS working)
- ✅ TEST 8: Extensions - SUCCESS (uuid-ossp)
- ✅ TEST 9: UUID Generation - SUCCESS
- ✅ TEST 10: Foreign Keys - SUCCESS (10+ constraints)

## Step 2: Run React App Tests

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:5173/supabase-test
   ```

3. **Click "Run All Tests"**

4. **Check all tests pass**:
   - ✅ Environment Variables
   - ✅ Basic Connection
   - ✅ Database Schema
   - ✅ Authentication Setup
   - ✅ RLS Policies
   - ✅ Realtime Capabilities
   - ✅ Google OAuth Configuration

## Step 3: Test Authentication

1. **Try to sign in with Google**:
   - Go to your app's login page
   - Click "Sign in with Google"
   - Should redirect to Google OAuth
   - Should redirect back to your app

2. **Check console for any errors**

## Troubleshooting

### If SQL Tests Fail:
- **Table Creation Failed**: Re-run `supabase-schema.sql`
- **RLS Failed**: Re-run `supabase-rls-policies.sql`
- **Functions Failed**: Re-run `supabase-functions-triggers.sql`

### If React Tests Fail:
- **Environment Variables**: Check `.env.local` file
- **Connection Failed**: Verify Supabase URL and keys
- **Schema Failed**: Run SQL tests first
- **Auth Failed**: Check Google OAuth configuration

### If Google OAuth Fails:
- **Check Google Cloud Console**: Verify redirect URIs
- **Check Supabase**: Verify Google provider is enabled
- **Check URLs**: Ensure all URLs match exactly

## Next Steps

Once all tests pass:
1. ✅ **Supabase setup is complete**
2. ✅ **Ready to migrate from Firebase**
3. ✅ **Can proceed with authentication migration**
4. ✅ **Can proceed with data migration**

---

**Run these tests now and let me know the results!**
