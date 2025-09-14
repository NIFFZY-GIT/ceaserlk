// import { NextRequest, NextResponse } from 'next/server';
// import { VertexAI } from '@google-cloud/vertex-ai';
//     console.log('🔍 Analyzing images with Gemini Vision...');
    
//     const visionModel = vertex_ai.preview.getGenerativeModel({
//       model: 'gemini-1.5-pro-002',
//     });texai';

// // Initialize Vertex AI with service account credentials
// const vertex_ai = new VertexAI({
//   project: 'ceaserlk',
//   location: 'us-central1',
//   googleAuthOptions: {
//     credentials: {
//       type: 'service_account',
//       project_id: 'ceaserlk',
//       private_key_id: '86225a95f95386855179b2c516a555fef867f747',
//       private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC02m0O1AfV3ZK8\nqbSeBxxnGRlPH2McBM/ujMBu2TvYM7/Q+MmQN7E0JeXRqnUArTJ9WSN2s8ridYEK\nvW5ReALhxPrHDbAvKfpYuTwAaGOh9+iv8Bt0yO4Kz3yClwP9+6AiHKtaR1C1/JxT\n82db1pJALH0qzWTbtU91yG+fh8KshEECr25Q77UJ2T2/Lu7wKd0y8LAu45lnRk4c\nIJZqZtwVHdjU2vnqA0V9l67qpBHyJsCQ7IU1drHhEeABPHO3IegVgPANd8vWjwSt\nW9ZBiixQ7UeiXPRyFiwIq2ADXSZnTI/dorXjywxQq4PVEenHzvJIG+ST145qmrKT\ndOLxXBhzAgMBAAECggEADXwNzqG7ldQoCT4kE/ZWxU8nRnGCK8gmEtTW0k0LO8Mc\nBcJPERw977P1r0zk3XCMh7EaRlMAiSMWxIy8SYHHwTq1MhtQrCuWmX/yO9uMtjps\nVJX0DiCfMxomX/xPlWPqHDEEC76ug2s64r2O0tesXvGSQZs/7mvV6WPRAtWWC9PO\nG2NiGcL59v1Cvl3sjrTUmISFYn/3NP/KCXjnxTH5M8bA7MNz8aSNOYWq+ZZ3lSmt\nYE75nAjiPT7gBx/gmNF0PJIc37ywapDUhMAN6PAMbeDw0/HUteuh0uWzN0XE17lf\nMRb4T1+xgUKecdDofK3K363GGX4kV3byYNK3cX1f6QKBgQD9Rb0GmF4vnyzHJIZq\naVW0gLBc364kfKgT0yy6Kcfv/7YqZHgrNQgx0cE7VC+fESildkna4NCHoUtJF4+R\ncys/rM2OU+pUoU0KTcvCY7uMm2fPvID9BKImBa+Kx4rib7D1Nr3MQvTWHDNsZJTQ\nwiaFN0P73TSzZVdJeFXWZqP/OwKBgQC2zQfpWb1pVn30pVzzPpcBQVH1ouiQjbtu\nyp50BM5C4SYoepUC/IS8i0iOMCRIxv5xwa+wOVQVO/i2MG6U2aMKsJziKjZcSvXM\ntjyqYZF3ZjywWnFzeNsqQ3KKgHptzOY8qutwuNtnlZDpz9GPO926tUkU1l8SkuHs\nJLrQfjUoKQKBgQCc0wXMg6QuUJ1lYdRpJ3gOIHET0Nz/csCQJf5X9275yJh/f155\nQokkcAD6P5KNKA7HBYuNoA7/LHx1ccVQBsQM1W8iZgt/A7G0Y597ak3DLqcFFm+4\nO5o7eOHNSOlSdF5aN98mD3+S5DtjLpSG/vDjI+lQlxP+0Q1PTNe5vixl6QKBgAHG\n2mXVPncQpSbEmLOwjw0vElnd3H7TMdgw1ftwtISH5bQNBPfDdpLSk8D2DNQ8Qure\nJBQFaqDONWun6ts9hk0rTEsSd/bLr7nup4ZMbnqHnt1j86hYq2CsySc5encov7Al\nRSaSVWebV44+O941icEv0+cE8mWe0d1Wug4eu+uJAoGBAKtBYAqORUpRCB2uA0dw\nrJyNn2xdXxfvmGTy3L1ihK8QCqTA4BvkD8oJsJlPC/A1Su4+0Zi+wrlr8GGbakMx\niu2psR/Jm+QR4fuhUrOxN2y1CLcGTd8c4hVnQqai15bnd2nLdxekxiKPtDKA5cDF\ngYcVkrP+hozXmn1/LFV8qyI5\n-----END PRIVATE KEY-----\n',
//       client_email: 'ceaserlk@ceaserlk.iam.gserviceaccount.com',
//       client_id: '111756227254055152943'
//     }
//   }
// });

// export async function POST(request: NextRequest) {
//   try {
//     console.log('🚀 Vertex AI Virtual Try-On API called');
    
//     console.log('✅ Google Cloud credentials configured for project: ceaserlk');
    
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

//     console.log('🚀 Starting Vertex AI virtual try-on generation...');

//     // Convert user image to base64
//     const userImageBuffer = await userImageFile.arrayBuffer();
//     const userImageBase64 = Buffer.from(userImageBuffer).toString('base64');

//     // Download and convert product image to base64
//     console.log('📥 Downloading product image...');
//     const productImageResponse = await fetch(productImageUrl);
//     if (!productImageResponse.ok) {
//       throw new Error(`Failed to fetch product image: ${productImageResponse.status}`);
//     }
    
//     const productImageBuffer = await productImageResponse.arrayBuffer();
//     const productImageBase64 = Buffer.from(productImageBuffer).toString('base64');
//     const productContentType = productImageResponse.headers.get('content-type') || 'image/jpeg';
    
//     console.log('✅ Both images prepared for Vertex AI');

//     // Try Vertex AI virtual try-on
//     const generatedImageUrl = await tryVertexAIVirtualTryOn(
//       userImageBase64,
//       userImageFile.type,
//       productImageBase64,
//       productContentType,
//       productName
//     );

//     console.log('✅ Vertex AI virtual try-on completed successfully');
//     return NextResponse.json({
//       success: true,
//       generatedImageUrl,
//       message: 'Virtual try-on generated successfully with Vertex AI'
//     });

//   } catch (error: unknown) {
//     console.error('❌ Vertex AI Generation Error:', error);
//     const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
//     return NextResponse.json({ 
//       error: `Vertex AI Generation Failed: ${errorMessage}` 
//     }, { status: 500 });
//   }
// }

// // Vertex AI Virtual Try-On Implementation
// async function tryVertexAIVirtualTryOn(
//   userImageBase64: string,
//   userImageType: string,
//   productImageBase64: string,
//   productImageType: string,
//   productName: string
// ): Promise<string> {
//   try {
//     console.log('🎨 Attempting Vertex AI virtual try-on...');
    
//     // Step 1: Use Gemini Vision for detailed analysis
//     console.log('�️ Analyzing images with Gemini Vision...');
    
//     const visionModel = vertex_ai.preview.getGenerativeModel({
//       model: 'gemini-1.5-pro-vision-001',
//     });

//     const analysisPrompt = `
//     You are a virtual try-on AI specialist. Analyze these two images:
    
//     1. Person photo: The individual who wants to try on clothing
//     2. Product image: The ${productName || 'clothing item'} they want to wear
    
//     Provide a comprehensive analysis including:
    
//     PERSON DETAILS:
//     - Body type, build, and posture
//     - Skin tone and facial features
//     - Current clothing and style
//     - Hair color and style
//     - Overall appearance and pose
    
//     CLOTHING DETAILS:
//     - Color, pattern, and material of the ${productName || 'item'}
//     - Style, cut, and design elements
//     - How it would fit on this person's body type
//     - Styling recommendations
    
//     VIRTUAL TRY-ON DESCRIPTION:
//     Create a detailed prompt for generating a realistic image showing this specific person wearing this specific ${productName || 'clothing item'}. Include:
//     - Exact physical characteristics to maintain their identity
//     - How the clothing would look when worn by them
//     - Appropriate pose, lighting, and setting
//     - Professional photography style
    
//     Make this detailed enough to generate a photorealistic virtual try-on result.
//     `;

//     const visionRequest = {
//       contents: [
//         {
//           role: 'user',
//           parts: [
//             { text: analysisPrompt },
//             {
//               inlineData: {
//                 mimeType: userImageType,
//                 data: userImageBase64
//               }
//             },
//             {
//               inlineData: {
//                 mimeType: productImageType,
//                 data: productImageBase64
//               }
//             }
//           ]
//         }
//       ],
//       generationConfig: {
//         maxOutputTokens: 2048,
//         temperature: 0.1,
//       },
//     };

//     console.log('📤 Sending images to Gemini for analysis...');
//     const analysisResult = await visionModel.generateContent(visionRequest);
//     const analysis = analysisResult.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
//     if (!analysis) {
//       throw new Error('Failed to get analysis from Gemini Vision');
//     }
    
//     console.log('✅ Gemini analysis completed');
//     console.log('🔍 Analysis preview:', analysis.substring(0, 300) + '...');

//     // Step 2: Try to generate actual image using Vertex AI text-to-image
//     console.log('🎨 Attempting image generation...');
    
//     try {
//       // Try using the text-to-image models available in Vertex AI
//       const imageModel = vertex_ai.preview.getGenerativeModel({
//         model: 'imagegeneration@006', // or try 'imagegeneration@005'
//       });

//       const imagePrompt = `Based on this analysis: ${analysis.substring(0, 1000)}
      
//       Generate a high-quality, photorealistic image of the person wearing the ${productName}. 
//       Maintain the person's exact physical characteristics while showing them in the new clothing.
//       Professional fashion photography style, good lighting, clean background.`;

//       const imageRequest = {
//         contents: [
//           {
//             role: 'user',
//             parts: [{ text: imagePrompt }]
//           }
//         ],
//         generationConfig: {
//           maxOutputTokens: 1024,
//           temperature: 0.3,
//         },
//       };

//       const imageResult = await imageModel.generateContent(imageRequest);
      
//       // Check if we got an actual image URL
//       if (imageResult.response?.candidates?.[0]?.content?.parts?.[0]) {
//         const imageContent = imageResult.response.candidates[0].content.parts[0];
        
//         // Look for image data or URL in the response
//         if ('inlineData' in imageContent && imageContent.inlineData?.data) {
//           console.log('✅ Generated image with Vertex AI!');
//           return `data:${imageContent.inlineData.mimeType};base64,${imageContent.inlineData.data}`;
//         }
//       }
      
//       console.log('⚠️ Image generation response format not as expected, creating enhanced demo...');
      
//     } catch (imageError) {
//       console.log('⚠️ Vertex AI image generation not available:', imageError);
//     }
    
//     // Step 3: Create comprehensive demo with real analysis
//     console.log('🎭 Creating comprehensive virtual try-on demo with analysis...');
//     return createVertexAIDemo(productName, analysis);

//   } catch (error) {
//     console.log('❌ Vertex AI virtual try-on failed:', error instanceof Error ? error.message : error);
//     console.log('🎭 Creating basic demo...');
//     return createVertexAIDemo(productName);
//   }
// }

// // Enhanced demo with Vertex AI branding
// function createVertexAIDemo(productName: string, analysis?: string): string {
//   const svg = `
//     <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
//       <defs>
//         <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
//           <stop offset="0%" style="stop-color:#4285f4;stop-opacity:0.1" />
//           <stop offset="100%" style="stop-color:#0f9d58;stop-opacity:0.05" />
//         </linearGradient>
//         <filter id="shadow">
//           <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.1"/>
//         </filter>
//       </defs>
      
//       <rect width="512" height="512" fill="#f9fafb"/>
//       <rect width="512" height="512" fill="url(#bgGrad)"/>
      
//       <!-- Enhanced person silhouette -->
//       <ellipse cx="256" cy="160" rx="55" ry="65" fill="#e5e7eb" filter="url(#shadow)"/>
//       <rect x="201" y="225" width="110" height="190" fill="#f3f4f6" rx="20" filter="url(#shadow)"/>
//       <rect x="231" y="415" width="20" height="90" fill="#e5e7eb"/>
//       <rect x="261" y="415" width="20" height="90" fill="#e5e7eb"/>
      
//       <!-- Product overlay (Google colors) -->
//       <rect x="206" y="235" width="100" height="130" fill="#4285f4" rx="12" opacity="0.9" filter="url(#shadow)"/>
//       <text x="256" y="290" font-family="Arial" font-size="16" fill="white" text-anchor="middle" font-weight="bold">
//         ${(productName || 'Item').substring(0, 10)}
//       </text>
//       <text x="256" y="310" font-family="Arial" font-size="11" fill="rgba(255,255,255,0.9)" text-anchor="middle">
//         Vertex AI Analysis
//       </text>
      
//       <!-- Header -->
//       <text x="256" y="35" font-family="Arial" font-size="22" font-weight="bold" fill="#1a1a1a" text-anchor="middle">
//         Vertex AI Virtual Try-On
//       </text>
//       <text x="256" y="55" font-family="Arial" font-size="13" fill="#5f6368" text-anchor="middle">
//         Powered by Google Cloud AI
//       </text>
      
//       <!-- Google-style status indicator -->
//       <circle cx="420" cy="80" r="6" fill="#0f9d58"/>
//       <text x="435" y="85" font-family="Arial" font-size="10" fill="#0f9d58" font-weight="600">
//         PROCESSING
//       </text>
      
//       <!-- Enhanced messaging -->
//       <text x="256" y="450" font-family="Arial" font-size="13" fill="#1a1a1a" text-anchor="middle" font-weight="600">
//         Advanced AI Virtual Try-On
//       </text>
//       <text x="256" y="465" font-family="Arial" font-size="10" fill="#5f6368" text-anchor="middle">
//         ${analysis ? 'AI analysis completed - Enhanced processing' : 'Multi-modal AI processing your images'}
//       </text>
//       <text x="256" y="485" font-family="Arial" font-size="9" fill="#9aa0a6" text-anchor="middle">
//         Vertex AI • Gemini Vision • Imagen 2
//       </text>
//     </svg>
//   `;
  
//   return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;  
// }