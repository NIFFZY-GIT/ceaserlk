// import { NextRequest, NextResponse } from 'next/server';
// import Replicate from 'replicate';

// const replicate = new Replicate({
//   auth: process.env.REPLICATE_API_TOKEN,
// });

// export async function POST(request: NextRequest) {
//   try {
//     console.log('🚀 Virtual Try-On API called');
//     console.log('🔑 Replicate token exists:', !!process.env.REPLICATE_API_TOKEN);
    
//     const formData = await request.formData();
//     const userImageFile = formData.get('userImage') as File;
//     const productImageUrl = formData.get('productImageUrl') as string;
//     const productName = formData.get('productName') as string;

//     console.log('📝 Received data:');
//     console.log('  - User image:', userImageFile?.name, userImageFile ? `${(userImageFile.size / 1024 / 1024).toFixed(2)}MB` : 'None');
//     console.log('  - Product URL:', productImageUrl);
//     console.log('  - Product name:', productName);

//     if (!userImageFile || !productImageUrl) {
//       console.log('❌ Missing required data');
//       return NextResponse.json({ error: 'Missing user image or product image URL' }, { status: 400 });
//     }

//     console.log('🚀 Starting virtual try-on generation...');

//     // Convert user image to base64 data URL
//     const userImageBuffer = await userImageFile.arrayBuffer();
//     const userImageBase64 = Buffer.from(userImageBuffer).toString('base64');
//     const userImageDataUrl = `data:${userImageFile.type};base64,${userImageBase64}`;

//     // Try AI generation
//     const generatedImageUrl = await tryVirtualTryOn(userImageDataUrl, productImageUrl, productName);

//     console.log('✅ Virtual try-on completed successfully');
//     return NextResponse.json({
//       success: true,
//       generatedImageUrl,
//       message: 'Virtual try-on generated successfully'
//     });

//   } catch (error: unknown) {
//     console.error('❌ AI Generation Error:', error);
//     const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
//     return NextResponse.json({ 
//       error: `AI Generation Failed: ${errorMessage}` 
//     }, { status: 500 });
//   }
// }

// // Real virtual try-on implementation
// async function tryVirtualTryOn(userImageUrl: string, productImageUrl: string, productName: string): Promise<string> {
//   try {
//     console.log('🎨 Attempting real virtual try-on with person + clothing...');
//     console.log('👤 User image:', userImageUrl ? 'Provided' : 'Missing');
//     console.log('👕 Product image:', productImageUrl);
//     console.log('📝 Product name:', productName);
    
//     // Try virtual try-on models in order of preference
//     const virtualTryOnModels = [
//       // Model 1: OOTDiffusion for virtual try-on
//       {
//         name: "OOTDiffusion Virtual Try-On",
//         id: "levihsu/ootdiffusion",
//         inputs: {
//           model_type: "hd",
//           cloth_image: productImageUrl,
//           human_image: userImageUrl,
//           description: `${productName || 'clothing item'}`,
//           num_inference_steps: 20,
//           guidance_scale: 2.0,
//           seed: Math.floor(Math.random() * 100000)
//         }
//       },
//       // Model 2: IDM-VTON for virtual try-on
//       {
//         name: "IDM-VTON Virtual Try-On", 
//         id: "cuuupid/idm-vton",
//         inputs: {
//           human_img: userImageUrl,
//           garment_img: productImageUrl,
//           garment_des: `${productName || 'clothing item'}`,
//           is_checked: true,
//           is_checked_crop: false,
//           denoise_steps: 30,
//           seed: Math.floor(Math.random() * 100000)
//         }
//       }
//     ];

//     // Try each virtual try-on model
//     for (const model of virtualTryOnModels) {
//       try {
//         console.log(`🔄 Trying ${model.name}...`);
//         const output = await replicate.run(model.id as `${string}/${string}`, { input: model.inputs });
        
//         console.log(`🔍 ${model.name} output:`, typeof output, Array.isArray(output) ? `Array[${output.length}]` : 'Object/String');

//         if (Array.isArray(output) && output.length > 0) {
//           console.log(`✅ ${model.name} succeeded!`);
//           return output[0] as string;
//         } else if (typeof output === 'string') {
//           console.log(`✅ ${model.name} succeeded!`);
//           return output;
//         } else if (output && typeof output === 'object' && 'url' in output) {
//           const imageUrl = (output as { url: () => string }).url();
//           console.log(`✅ ${model.name} succeeded!`);
//           return imageUrl;
//         }
        
//         console.log(`⚠️ ${model.name} returned unexpected format, trying next...`);
//       } catch (error) {
//         console.log(`❌ ${model.name} failed:`, error instanceof Error ? error.message : error);
//         console.log(`🔄 Trying next model...`);
//       }
//     }

//     // Fallback: Enhanced Ideogram generation with fashion context
//     console.log('🔄 Fallback: Using Ideogram with enhanced fashion prompt...');
//     const fallbackInput = {
//       prompt: `Professional fashion model wearing ${productName || 'stylish clothing'}, full body shot, studio photography, clean white background, fashion catalog style, high resolution, realistic, professional lighting, model pose, virtual try-on result`,
//       resolution: "None", 
//       style_type: "Realistic",
//       aspect_ratio: "1:1",
//       style_preset: "None",
//       magic_prompt_option: "Auto"
//     };

//     const fallbackOutput = await replicate.run("ideogram-ai/ideogram-v3-turbo", { input: fallbackInput });

//     if (fallbackOutput && typeof fallbackOutput === 'object' && 'url' in fallbackOutput) {
//       const imageUrl = (fallbackOutput as { url: () => string }).url();
//       console.log('✅ Fallback generation succeeded!');
//       return imageUrl;
//     }

//     throw new Error('All virtual try-on approaches failed');

//   } catch (error) {
//     console.log('❌ All virtual try-on approaches failed:', error instanceof Error ? error.message : error);
//     console.log('🔍 Full error:', error);
//     console.log('🎭 Using enhanced virtual try-on demo...');
//     return createVirtualTryOnDemo(productName, userImageUrl);
//   }
// }

// // Enhanced virtual try-on demo
// function createVirtualTryOnDemo(productName: string, userImageUrl?: string): string {
//   const svg = `
//     <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
//       <defs>
//         <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
//           <stop offset="0%" style="stop-color:#107D3F;stop-opacity:0.1" />
//           <stop offset="100%" style="stop-color:#107D3F;stop-opacity:0.05" />
//         </linearGradient>
//         <filter id="shadow">
//           <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.1"/>
//         </filter>
//       </defs>
      
//       <rect width="512" height="512" fill="#f9fafb"/>
//       <rect width="512" height="512" fill="url(#bgGrad)"/>
      
//       <!-- Person silhouette (more detailed) -->
//       <ellipse cx="256" cy="160" rx="50" ry="60" fill="#e5e7eb" filter="url(#shadow)"/>
//       <rect x="206" y="220" width="100" height="180" fill="#f3f4f6" rx="15" filter="url(#shadow)"/>
//       <rect x="236" y="400" width="18" height="90" fill="#e5e7eb"/>
//       <rect x="258" y="400" width="18" height="90" fill="#e5e7eb"/>
      
//       <!-- Product overlay (enhanced) -->
//       <rect x="211" y="230" width="90" height="120" fill="#107D3F" rx="10" opacity="0.9" filter="url(#shadow)"/>
//       <text x="256" y="280" font-family="Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">
//         ${(productName || 'Item').substring(0, 12)}
//       </text>
//       <text x="256" y="300" font-family="Arial" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">
//         Virtual Try-On Result
//       </text>
      
//       <!-- Header -->
//       <text x="256" y="35" font-family="Arial" font-size="20" font-weight="bold" fill="#111827" text-anchor="middle">
//         Virtual Try-On Preview
//       </text>
//       <text x="256" y="55" font-family="Arial" font-size="12" fill="#6b7280" text-anchor="middle">
//         AI-Powered Fashion Technology
//       </text>
      
//       <!-- Status indicator -->
//       <circle cx="430" cy="80" r="8" fill="#107D3F" opacity="0.8"/>
//       <text x="445" y="85" font-family="Arial" font-size="10" fill="#107D3F" font-weight="600">
//         DEMO
//       </text>
      
//       <!-- Instructions -->
//       <text x="256" y="440" font-family="Arial" font-size="12" fill="#374151" text-anchor="middle" font-weight="600">
//         Real Virtual Try-On Coming Soon!
//       </text>
//       <text x="256" y="455" font-family="Arial" font-size="10" fill="#6b7280" text-anchor="middle">
//         Your photo + ${productName || 'this item'} = Perfect fit preview
//       </text>
//       <text x="256" y="475" font-family="Arial" font-size="9" fill="#9ca3af" text-anchor="middle">
//         ${userImageUrl ? '✓ Photo uploaded successfully!' : 'Upload your photo to see the magic!'}
//       </text>
//     </svg>
//   `;
  
//   return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
// }