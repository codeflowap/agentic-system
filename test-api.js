// Test script for the Business Scraper API
// Run this after starting the server with: npm run dev

async function testAPI() {
  const baseURL = "http://localhost:3000";
  
  console.log("🧪 Testing Business Scraper API...\n");
  
  // Test 1: Health Check
  console.log("1️⃣ Testing health endpoint...");
  try {
    const healthRes = await fetch(`${baseURL}/api/business/health`);
    const health = await healthRes.json();
    console.log("✅ Health check:", health.message);
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
  }
  
  // Test 2: Generate Brand Kit
  console.log("\n2️⃣ Testing brand kit generation for tapistro.com...");
  try {
    const generateRes = await fetch(`${baseURL}/api/business/generate-brandkit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://tapistro.com" }),
    });
    
    const result = await generateRes.json();
    
    if (result.success) {
      console.log("✅ Brand kit generated successfully!");
      console.log("   ID:", result.data.id);
      console.log("   URL:", result.data.url);
      console.log("\n📊 Brand Kit Summary:");
      console.log("   About:", result.data.brandKit.aboutTheBrand.substring(0, 100) + "...");
      console.log("   Tone:", result.data.brandKit.toneOfVoice);
      console.log("\n🎯 Competitors Found:");
      result.data.competitors.competitors.forEach((comp, i) => {
        console.log(`   ${i + 1}. ${comp.name} (${comp.url})`);
      });
      
      // Test 3: Retrieve Brand Kit
      console.log(`\n3️⃣ Testing retrieval of brand kit ${result.data.id}...`);
      const getRes = await fetch(`${baseURL}/api/business/brandkit/${result.data.id}`);
      const retrieved = await getRes.json();
      console.log("✅ Brand kit retrieved successfully");
      
    } else {
      console.error("❌ Brand kit generation failed:", result.error);
    }
  } catch (error) {
    console.error("❌ API test failed:", error.message);
  }
  
  // Test 4: List all brand kits
  console.log("\n4️⃣ Testing list all brand kits...");
  try {
    const listRes = await fetch(`${baseURL}/api/business/brandkits`);
    const list = await listRes.json();
    console.log(`✅ Found ${list.data.length} brand kit(s)`);
  } catch (error) {
    console.error("❌ List failed:", error.message);
  }
  
  console.log("\n✨ API testing complete!");
}

// Run tests
testAPI();