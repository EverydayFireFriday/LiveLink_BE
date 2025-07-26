export const uploadSchemas = {
  FileUpload: {
    type: "object",
    required: ["_id", "filename", "originalName", "mimeType", "size", "url", "uploadedBy", "createdAt"],
    properties: {
      _id: {
        type: "string",
        description: "파일 고유 ID",
        example: "507f1f77bcf86cd799439019"
      },
      filename: {
        type: "string",
        description: "저장된 파일명",
        example: "1703123456789_profile_image.jpg"
      },
      originalName: {
        type: "string",
        description: "원본 파일명",
        example: "profile_image.jpg"
      },
      mimeType: {
        type: "string",
        description: "파일 MIME 타입",
        example: "image/jpeg"
      },
      size: {
        type: "number",
        description: "파일 크기 (bytes)",
        example: 1024000
      },
      url: {
        type: "string",
        format: "uri",
        description: "파일 접근 URL",
        example: "https://cdn.livelink.app/uploads/1703123456789_profile_image.jpg"
      },
      uploadedBy: {
        type: "string",
        description: "업로드한 사용자 ID",
        example: "507f1f77bcf86cd799439012"
      },
      category: {
        type: "string",
        enum: ["profile", "article", "concert", "chat"],
        description: "파일 카테고리",
        example: "profile"
      },
      isPublic: {
        type: "boolean",
        description: "공개 여부",
        example: true
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "업로드 시간"
      }
    }
  },

  UploadResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true
      },
      message: {
        type: "string",
        example: "파일 업로드 성공"
      },
      data: {
        $ref: "#/components/schemas/FileUpload"
      }
    }
  }
};