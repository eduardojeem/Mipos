const { createClient } = require("@supabase/supabase-js");

async function setupTestUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log("🔍 Verificando usuarios existentes...");
  
  try {
    // Intentar crear un usuario de prueba
    const testEmail = "admin@cosmeticos.com";
    const testPassword = "admin123456";
    
    console.log("📧 Intentando crear usuario:", testEmail);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: "Administrador",
          role: "admin"
        }
      }
    });
    
    if (signUpError) {
      console.log("⚠️ Error en registro (puede que ya exista):", signUpError.message);
      
      // Intentar hacer login si el usuario ya existe
      console.log("🔑 Intentando hacer login...");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (signInError) {
        console.log("❌ Error en login:", signInError.message);
        return;
      }
      
      console.log("✅ Login exitoso");
      console.log("Token:", signInData.session?.access_token ? "Presente" : "Ausente");
      return signInData.session?.access_token;
    } else {
      console.log("✅ Usuario creado exitosamente");
      console.log("Token:", signUpData.session?.access_token ? "Presente" : "Ausente");
      return signUpData.session?.access_token;
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

setupTestUser().then(token => {
  if (token) {
    console.log("🎉 Token obtenido, guardando para pruebas...");
    require("fs").writeFileSync("test-token.txt", token);
  }
});
