import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import mammoth from 'npm:mammoth@1.8.0';
import pdfParse from 'npm:pdf-parse@1.1.1';

const MAX_TEXT_LENGTH = 50000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { file_url, file_name, file_type } = await req.json();
    
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }
    
    console.log('[extractFileContent] Processing:', file_name, file_type);
    
    // 下载文件
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ 
        success: false,
        error: 'Failed to download file' 
      }, { status: 400 });
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    
    // 根据文件类型处理
    let content = '';
    let contentType = 'text';
    
    // 图片文件 - 返回base64
    if (file_type?.startsWith('image/')) {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
      return Response.json({
        success: true,
        content_type: 'image',
        content: base64,
        media_type: file_type,
        file_name,
        truncated: false
      });
    }
    
    // 文本文件
    if (file_type === 'text/plain' || file_name?.endsWith('.txt')) {
      const decoder = new TextDecoder('utf-8');
      content = decoder.decode(fileBuffer);
    }
    
    // Word文档
    else if (file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             file_name?.endsWith('.docx')) {
      try {
        const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
        content = result.value;
      } catch (error) {
        console.error('[extractFileContent] DOCX extraction error:', error);
        return Response.json({ 
          success: false,
          error: `Failed to extract DOCX: ${error.message}` 
        }, { status: 500 });
      }
    }
    
    // PDF文件
    else if (file_type === 'application/pdf' || file_name?.endsWith('.pdf')) {
      try {
        const pdfData = await pdfParse(Buffer.from(fileBuffer));
        content = pdfData.text;
      } catch (error) {
        console.error('[extractFileContent] PDF extraction error:', error);
        return Response.json({ 
          success: false,
          error: `Failed to extract PDF: ${error.message}` 
        }, { status: 500 });
      }
    }
    
    // 不支持的文件类型
    else {
      return Response.json({ 
        success: false,
        error: 'Unsupported file type. Supported: txt, docx, pdf, images' 
      }, { status: 400 });
    }
    
    // 文本截断
    let truncated = false;
    if (content.length > MAX_TEXT_LENGTH) {
      content = content.slice(0, MAX_TEXT_LENGTH);
      truncated = true;
    }
    
    console.log('[extractFileContent] Success:', content.length, 'chars, truncated:', truncated);
    
    return Response.json({
      success: true,
      content_type: 'text',
      content,
      file_name,
      truncated,
      original_length: content.length
    });
    
  } catch (error) {
    console.error('[extractFileContent] Error:', error);
    console.error('[extractFileContent] Stack:', error.stack);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});