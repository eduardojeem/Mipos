const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createAvatarsBucket() {
  console.log('🗂️ Creating avatars bucket and setting up policies...\n');

  try {
    // 1. Check existing buckets
    console.log('1. Checking existing buckets...');
    
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }

    console.log('✅ Current buckets:', existingBuckets.map(b => b.name).join(', ') || 'None');

    // 2. Create avatars bucket if it doesn't exist
    const avatarsBucket = existingBuckets.find(b => b.name === 'avatars');
    
    if (avatarsBucket) {
      console.log('✅ Avatars bucket already exists');
    } else {
      console.log('\n2. Creating avatars bucket...');
      
      const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml'
        ],
        fileSizeLimit: 5242880 // 5MB
      });

      if (bucketError) {
        console.error('❌ Error creating bucket:', bucketError.message);
        return;
      }

      console.log('✅ Avatars bucket created successfully');
    }

    // 3. Set up storage policies using SQL
    console.log('\n3. Setting up storage policies...');

    // Policy to allow authenticated users to upload to their own folder
    const uploadPolicy = `
      CREATE POLICY "Users can upload avatars to their own folder" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    `;

    // Policy to allow authenticated users to update their own files
    const updatePolicy = `
      CREATE POLICY "Users can update their own avatars" ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    `;

    // Policy to allow authenticated users to delete their own files
    const deletePolicy = `
      CREATE POLICY "Users can delete their own avatars" ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    `;

    // Policy to allow public read access to avatars
    const readPolicy = `
      CREATE POLICY "Public can view avatars" ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'avatars');
    `;

    const policies = [
      { name: 'Upload Policy', sql: uploadPolicy },
      { name: 'Update Policy', sql: updatePolicy },
      { name: 'Delete Policy', sql: deletePolicy },
      { name: 'Read Policy', sql: readPolicy }
    ];

    for (const policy of policies) {
      try {
        console.log(`   Creating ${policy.name}...`);
        
        const { error: policyError } = await supabase.rpc('exec_sql', {
          sql: policy.sql
        });

        if (policyError && !policyError.message.includes('already exists')) {
          console.log(`   ⚠️ ${policy.name} error: ${policyError.message}`);
        } else {
          console.log(`   ✅ ${policy.name} created/exists`);
        }
      } catch (err) {
        console.log(`   ⚠️ ${policy.name} error: ${err.message}`);
      }
    }

    // 4. Test the setup
    console.log('\n4. Testing the setup...');

    // Create test client
    const testClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Authenticate
    const { data: authData, error: authError } = await testClient.auth.signInWithPassword({
      email: 'admin@test.com',
      password: 'Admin123!'
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return;
    }

    console.log('✅ Authentication successful');

    // Test bucket access
    const { data: buckets, error: bucketsError } = await testClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error accessing buckets:', bucketsError.message);
    } else {
      console.log('✅ Bucket access successful');
      console.log('Available buckets:', buckets.map(b => b.name).join(', '));
    }

    // Test file upload
    console.log('\n5. Testing file upload...');

    const testContent = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="blue" stroke-width="3" fill="lightblue" />
  <text x="50" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="10">Avatar</text>
</svg>`;

    const fileName = `${authData.user.id}/test-avatar-${Date.now()}.svg`;

    const { data: uploadData, error: uploadError } = await testClient.storage
      .from('avatars')
      .upload(fileName, testContent, {
        contentType: 'image/svg+xml'
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
    } else {
      console.log('✅ Upload test successful');
      console.log('File path:', uploadData.path);

      // Test public URL
      const { data: urlData } = testClient.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('✅ Public URL generated:', urlData.publicUrl);

      // Clean up test file
      await testClient.storage.from('avatars').remove([fileName]);
      console.log('✅ Test file cleaned up');
    }

    // Clean up session
    await testClient.auth.signOut();

    console.log('\n🎉 Avatars bucket setup completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Upload avatar images through the frontend');
    console.log('2. Access uploaded avatars via public URLs');
    console.log('3. Users can only manage their own avatar files');

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createAvatarsBucket();