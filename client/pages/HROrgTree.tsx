import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Network, ZoomIn, ZoomOut, Maximize, FileText, Image as ImageIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function HROrgTree() {
  const [zoom, setZoom] = useState(100);

  // Helper component to render a tree node (mocking the image provided)
  const TreeNode = ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-[#004e89] text-white p-2 rounded min-w-[120px] text-center shadow-sm">
        <div className="font-medium text-sm">{title}</div>
        {subtitle && <div className="text-xs text-blue-200 mt-1">{subtitle}</div>}
      </div>
      <div className="w-px h-6 bg-[#004e89]"></div>
    </div>
  );

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        {/* Header Options */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox id="show_all" />
            <Label htmlFor="show_all" className="text-sm font-medium cursor-pointer">عرض إدارات (كل الفروع) بشكل منفصل</Label>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <span>استخراج</span>
                  <FileText className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="text-right">
                <DropdownMenuItem className="flex gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-500" />
                  <span>استخراج PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex gap-2 cursor-pointer">
                  <ImageIcon className="h-4 w-4 text-orange-500" />
                  <span>استخراج PNG</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex gap-2 cursor-pointer">
                  <Network className="h-4 w-4 text-yellow-500" />
                  <span>استخراج SVG</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tree Container */}
        <div className="bg-white rounded-lg border shadow-sm h-[600px] relative overflow-hidden flex flex-col">
          {/* Zoom Controls */}
          <div className="absolute right-6 bottom-6 flex flex-col gap-2 z-10 bg-white p-2 rounded-lg border shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.min(prev + 10, 200))}>
              <ZoomIn className="h-5 w-5 text-gray-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.max(prev - 10, 50))}>
              <ZoomOut className="h-5 w-5 text-gray-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(100)}>
              <Maximize className="h-5 w-5 text-gray-600" />
            </Button>
          </div>

          {/* Canvas Area (Mocking the complex tree with a simple representation) */}
          <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-10 cursor-grab active:cursor-grabbing">
            <div style={{ transform: `scale(${zoom / 100})`, transition: 'transform 0.2s' }} className="flex flex-col items-center">
              
              {/* Root Level */}
              <div className="flex justify-center w-full relative">
                <div className="absolute top-full left-1/2 w-[600px] h-px bg-[#004e89] -translate-x-1/2 mt-6"></div>
                <TreeNode title="الفرع الرئيسي" />
              </div>

              {/* Second Level */}
              <div className="flex justify-between w-[800px] mt-12 relative">
                <div className="flex flex-col items-center">
                  <div className="w-px h-6 bg-[#004e89] -mt-6"></div>
                  <TreeNode title="إدارة الموارد البشرية" subtitle="عبدالمجيد شودري" />
                  <div className="w-px h-6 bg-[#004e89]"></div>
                  <div className="bg-[#004e89] text-white p-2 rounded min-w-[120px] text-center shadow-sm mt-2">
                    <div className="font-medium text-sm">قسم شؤون الموظفين</div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-px h-6 bg-[#004e89] -mt-6"></div>
                  <TreeNode title="الإدارة المالية" subtitle="نادر القرشي" />
                  <div className="w-px h-6 bg-[#004e89]"></div>
                  <div className="bg-[#004e89] text-white p-2 rounded min-w-[120px] text-center shadow-sm mt-2">
                    <div className="font-medium text-sm">قسم الحسابات</div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-px h-6 bg-[#004e89] -mt-6"></div>
                  <TreeNode title="إدارة التسويق" subtitle="نادر القرشي" />
                </div>
              </div>
              
              {/* Additional decorative line to show it's a wide tree as in the image */}
              <div className="w-full h-2 bg-[#00bbf9] mt-20 opacity-50 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
