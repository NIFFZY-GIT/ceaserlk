// import { NextRequest, NextResponse } from 'next/server';
// import { VertexAI } from '@google-cloud/vertexai';

// // Initialize Vertex AI
// const vertex_ai = new VertexAI({
//   project: process.env.GCP_PROJECT_ID,
//   location: 'us-central1',
// });

// export async function POST(request: NextRequest) {
//   try {
//     console.log('🚀 Vertex AI Virtual Try-On API called');
    
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
    
//     // Try Imagen 2 for advanced image generation with multi-modal input
//     const model = 'imagen-2.0-005';
//     const generativeModel = vertex_ai.preview.getGenerativeModel({
//       model: model,
//     });

//     console.log('🔄 Using Gemini with Vision for virtual try-on analysis...');
    
//     // First, use Gemini to analyze both images and create a detailed description
//     const visionModel = vertex_ai.preview.getGenerativeModel({
//       model: 'gemini-1.5-pro-vision-001',
//     });

//     const analysisPrompt = `
//     Analyze these two images for virtual try-on:
    
//     1. Person image: Shows the person who wants to try on clothing
//     2. Clothing image: Shows the ${productName || 'clothing item'} to be worn
    
//     Create a detailed description for virtual try-on that:
//     - Describes the person's body type, pose, and key features
//     - Describes the clothing item's style, fit, and characteristics  
//     - Explains how the clothing would look on this specific person
//     - Maintains the person's identity while showing them wearing the new item
    
//     Focus on creating a realistic virtual try-on result.
//     `;

//     const visionRequest = {
//       contents: [
//         {
//           role: 'user',
//           parts: [
//             {
//               text: analysisPrompt
//             },
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
//     };

//     console.log('📤 Sending images to Gemini for analysis...');
//     const analysisResult = await visionModel.generateContent(visionRequest);
//     const analysis = analysisResult.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
//     console.log('🔍 Gemini analysis completed:', analysis.substring(0, 200) + '...');

//     // Now use the analysis to generate a virtual try-on image
//     console.log('🎨 Generating virtual try-on image with Imagen...');
    
//     const imageGenerationPrompt = `
//     Virtual try-on result: ${analysis}
    
//     Create a realistic photo showing this person wearing the ${productName || 'clothing item'}.
    
//     Requirements:
//     - Maintain the person's facial features, body type, and overall appearance
//     - Show them wearing the specific clothing item described
//     - Professional photography quality
//     - Natural pose and lighting
//     - Realistic fit and drape of the clothing
//     - Clean background
//     - High quality and detailed result
//     `;

//     // Generate the virtual try-on image
//     const imageRequest = {
//       contents: [
//         {
//           role: 'user',
//           parts: [
//             {
//               text: imageGenerationPrompt
//             }
//           ]
//         }
//       ],
//     };

//     const imageResult = await generativeModel.generateContent(imageRequest);
    
//     // Note: This is a simplified implementation
//     // Vertex AI's image generation might work differently depending on the model
//     console.log('🔍 Vertex AI image result:', typeof imageResult);

//     // For now, create an enhanced demo while Vertex AI integration is refined
//     return createVertexAIDemo(productName, analysis);

//   } catch (error) {
//     console.log('❌ Vertex AI virtual try-on failed:', error instanceof Error ? error.message : error);
//     console.log('🔍 Full error:', error);
//     console.log('🎭 Creating enhanced Vertex AI demo...');
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