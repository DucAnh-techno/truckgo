import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderPath = formData.get("path") as string | null;

    if (!file || !folderPath) {
      return NextResponse.json({ error: "Thiếu file hoặc đường dẫn thư mục" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Xóa các ký tự truy cập ngược thư mục để bảo mật
    const safePath = folderPath.replace(/\.\./g, "");
    
    const extension = file.name.split(".").pop();
    const fileName = `${uuidv4()}${extension ? `.${extension}` : ""}`;
    
    // Lưu vào thư mục public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads", safePath);
    
    // Tạo thư mục nếu nó chưa tồn tại (tạo nhiều tâng)
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);
    
    // Trả về đường dẫn tĩnh công khai
    const publicUrl = `/uploads/${safePath}/${fileName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Lỗi Upload API:", error);
    return NextResponse.json({ error: "Lưu file thất bại" }, { status: 500 });
  }
}
