"use client";

import { useSearchParams } from "next/navigation";
import { Box, Typography, Paper, Stack, Divider, Chip, Stepper, Step, StepLabel, StepContent } from "@mui/material";
import BookIcon from "@mui/icons-material/Book";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import ChatIcon from "@mui/icons-material/Chat";
import NotificationsIcon from "@mui/icons-material/Notifications";
import TimelineIcon from "@mui/icons-material/Timeline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

export default function UserGuidePage() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";
  const isSupervisor = role === "supervisor";

  const supervisorGuide = [
    {
      title: "Tổng quan",
      icon: <DashboardIcon />,
      sections: [
        {
          heading: "Bảng điều khiển",
          content: "Truy cập vào trang dự án để xem danh sách tất cả các dự án bạn đang giám sát. Tại đây bạn có thể:",
          items: [
            "Xem danh sách các dự án được giao cho bạn",
            "Theo dõi tiến độ tổng thể của từng dự án",
            "Xem thống kê và báo cáo của các dự án"
          ]
        }
      ]
    },
    {
      title: "Theo dõi và quản lý dự án",
      icon: <AccountTreeIcon />,
      sections: [
        {
          heading: "Vai trò của Giảng viên",
          content: "Với vai trò giảng viên, bạn chỉ xem và theo dõi tiến độ dự án. Sinh viên sẽ tạo tất cả các thành phần (Milestone, Feature, Function, Task). Quy trình theo dõi như sau:",
          steps: [
            {
              label: "Bước 1: Xem danh sách dự án",
              description: "Truy cập vào trang dự án để xem các dự án bạn đang giám sát",
              details: [
                "Vào trang '/supervisor/projects' để xem danh sách dự án",
                "Mỗi dự án hiển thị:",
                "  • Tên dự án",
                "  • Mã dự án",
                "  • Thông tin tổng quan",
                "Click vào dự án để xem chi tiết"
              ]
            },
            {
              label: "Bước 2: Xem cấu trúc dự án",
              description: "Hiểu cấu trúc phân cấp: Milestone → Feature → Function → Task",
              details: [
                "Vào trang dự án → Xem các tab:",
                "  • 'Cột mốc' (Milestones): Xem các milestone do sinh viên tạo",
                "  • 'Tính năng' (Features): Xem các tính năng do sinh viên tạo",
                "  • 'Chức năng' (Functions): Xem các chức năng do sinh viên tạo",
                "  • 'Công việc' (Tasks): Xem các công việc do sinh viên tạo",
                "Lưu ý: Bạn chỉ có quyền xem, không thể tạo hoặc chỉnh sửa"
              ]
            },
            {
              label: "Bước 3: Theo dõi tiến độ với Gantt Chart",
              description: "Sử dụng Gantt chart để theo dõi timeline và dependencies",
              details: [
                "Vào tab 'Công việc' → Chọn view 'Gantt'",
                "Xem timeline của:",
                "  • Milestone (màu sắc theo trạng thái)",
                "  • Feature",
                "  • Function",
                "  • Task",
                "Lọc theo milestone, tính năng hoặc chức năng",
                "Xem dependencies giữa các công việc",
                "Lưu ý: Màu sắc milestone thay đổi theo trạng thái (To Do, Doing, Done)"
              ]
            },
            {
              label: "Bước 4: Xem báo cáo và thống kê",
              description: "Sử dụng bảng điều khiển để xem thống kê chi tiết",
              details: [
                "Vào tab 'Công việc' → Chọn view 'Bảng điều khiển'",
                "Xem các thống kê:",
                "  • Tổng số công việc",
                "  • Phân bổ theo trạng thái (To Do, Doing, Done)",
                "  • Phân bổ theo ưu tiên (Low, Medium, High, Critical)",
                "  • Phân bổ theo thành viên (số công việc đã hoàn thành/chưa hoàn thành)",
                "  • Biểu đồ tròn và cột trực quan",
                "Sử dụng bộ lọc để xem thống kê theo milestone, tính năng, chức năng"
              ]
            },
            {
              label: "Bước 5: Xem chi tiết và đánh giá",
              description: "Xem chi tiết từng thành phần để đánh giá tiến độ",
              details: [
                "Xem chi tiết Milestone:",
                "  • Click vào milestone để xem thông tin",
                "  • Xem các tính năng liên kết",
                "  • Xem trạng thái tự động (dựa trên tính năng)",
                "Xem chi tiết Feature:",
                "  • Click vào feature để xem chi tiết",
                "  • Xem các chức năng thuộc feature",
                "  • Xem trạng thái tự động (dựa trên chức năng)",
                "Xem chi tiết Function:",
                "  • Click vào function để xem chi tiết",
                "  • Xem các công việc thuộc function",
                "  • Xem trạng thái tự động (dựa trên công việc)",
                "Xem chi tiết Task:",
                "  • Click vào task để xem chi tiết",
                "  • Xem dependencies và công việc liên quan",
                "  • Xem bình luận và tệp đính kèm",
                "  • Xem lịch sử hoạt động"
              ]
            },
            {
              label: "Bước 6: Giao tiếp với team",
              description: "Giao tiếp với các thành viên trong dự án",
              details: [
                "Tin nhắn nhóm:",
                "  • Truy cập tin nhắn của các team trong dự án bạn giám sát",
                "  • Gửi và nhận tin nhắn với các thành viên",
                "  • Theo dõi số tin nhắn chưa đọc",
                "Thông báo:",
                "  • Xem thông báo về cập nhật dự án",
                "  • Nhận thông báo khi có thay đổi quan trọng",
                "  • Quản lý và đánh dấu đã đọc các thông báo",
                "Lưu ý: Hệ thống tự động cập nhật trạng thái:",
                "  • Task 'Done' → Function tự động cập nhật",
                "  • Tất cả Functions 'Done' → Feature tự động 'Done'",
                "  • Tất cả Features 'Done' → Milestone tự động 'Done'"
              ]
            }
          ]
        }
      ]
    },
    {
      title: "Quản lý dự án",
      icon: <AssignmentIcon />,
      sections: [
        {
          heading: "Xem chi tiết dự án",
          content: "Click vào một dự án để xem chi tiết:",
          items: [
            "Xem thông tin tổng quan về dự án",
            "Theo dõi các milestone và tính năng",
            "Xem danh sách các chức năng và công việc",
            "Kiểm tra tiến độ hoàn thành"
          ]
        },
        {
          heading: "Xem Milestone",
          content: "Milestone giúp bạn theo dõi các cột mốc quan trọng:",
          items: [
            "Xem danh sách các milestone do sinh viên tạo",
            "Xem chi tiết milestone (click vào milestone)",
            "Xem các tính năng liên kết với milestone",
            "Theo dõi trạng thái của milestone (To Do, Doing, Done)",
            "Xem Gantt chart để theo dõi tiến độ",
            "Lưu ý: Trạng thái milestone tự động cập nhật dựa trên trạng thái của các tính năng liên kết",
            "Lưu ý: Bạn chỉ có quyền xem, không thể tạo hoặc chỉnh sửa milestone"
          ]
        },
        {
          heading: "Xem Tính năng (Features)",
          content: "Tính năng là các module chính của dự án:",
          items: [
            "Xem danh sách các tính năng do sinh viên tạo",
            "Xem chi tiết tính năng (click vào tính năng)",
            "Theo dõi trạng thái tự động của tính năng (dựa trên chức năng)",
            "Xem các chức năng liên quan đến mỗi tính năng",
            "Xem ưu tiên và thời hạn của tính năng",
            "Lưu ý: Trạng thái tính năng tự động cập nhật dựa trên trạng thái của các chức năng bên trong",
            "Lưu ý: Bạn chỉ có quyền xem, không thể tạo hoặc chỉnh sửa tính năng"
          ]
        }
      ]
    },
    {
      title: "Giao tiếp và Thông báo",
      icon: <ChatIcon />,
      sections: [
        {
          heading: "Tin nhắn nhóm",
          content: "Giao tiếp với các thành viên trong team:",
          items: [
            "Truy cập tin nhắn của các team trong dự án bạn giám sát",
            "Gửi và nhận tin nhắn với các thành viên",
            "Theo dõi số tin nhắn chưa đọc"
          ]
        },
        {
          heading: "Thông báo",
          content: "Nhận thông báo về các hoạt động trong dự án:",
          items: [
            "Xem thông báo về cập nhật dự án",
            "Nhận thông báo khi có thay đổi quan trọng",
            "Quản lý và đánh dấu đã đọc các thông báo"
          ]
        }
      ]
    },
    {
      title: "Theo dõi tiến độ",
      icon: <TimelineIcon />,
      sections: [
        {
          heading: "Gantt Chart",
          content: "Sử dụng Gantt chart để theo dõi tiến độ:",
          items: [
            "Xem timeline của các milestone và tính năng",
            "Theo dõi dependencies giữa các công việc",
            "Lọc theo milestone, tính năng hoặc chức năng",
            "Xem trạng thái màu sắc của từng milestone"
          ]
        },
        {
          heading: "Báo cáo và Thống kê",
          content: "Xem các báo cáo về tiến độ dự án:",
          items: [
            "Xem thống kê tổng quan về dự án",
            "Theo dõi số lượng công việc theo trạng thái",
            "Xem phân bổ công việc theo thành viên"
          ]
        }
      ]
    }
  ];

  const studentGuide = [
    {
      title: "Tổng quan",
      icon: <DashboardIcon />,
      sections: [
        {
          heading: "Bảng điều khiển",
          content: "Truy cập vào trang dashboard để xem tổng quan về các dự án của bạn:",
          items: [
            "Xem danh sách các dự án bạn tham gia",
            "Theo dõi tiến độ công việc của bạn",
            "Xem thống kê về công việc đã hoàn thành"
          ]
        }
      ]
    },
    {
      title: "Tạo luồng công việc",
      icon: <AccountTreeIcon />,
      sections: [
        {
          heading: "Quy trình tạo luồng công việc từ đầu",
          content: "Để tạo một luồng công việc hoàn chỉnh, bạn cần thực hiện theo thứ tự sau:",
          steps: [
            {
              label: "Bước 1: Hiểu cấu trúc dự án",
              description: "Nắm rõ cấu trúc phân cấp: Milestone → Feature → Function → Task",
              details: [
                "Milestone: Cột mốc quan trọng (ví dụ: Sprint 1, Sprint 2)",
                "Feature: Tính năng lớn (ví dụ: Đăng nhập, Quản lý user)",
                "Function: Chức năng nhỏ trong tính năng (ví dụ: Xử lý đăng nhập bằng email)",
                "Task: Công việc cụ thể (ví dụ: Thiết kế form đăng nhập)",
                "Lưu ý: Trạng thái tự động lan truyền từ Task → Function → Feature → Milestone"
              ]
            },
            {
              label: "Bước 2: Xem các Milestone và Feature có sẵn",
              description: "Kiểm tra xem milestone và feature đã được tạo chưa",
              details: [
                "Vào trang dự án → Tab 'Cột mốc' để xem các milestone",
                "Vào tab 'Tính năng' để xem các feature",
                "Nếu chưa có, giảng viên sẽ tạo cho bạn",
                "Nếu đã có, bạn có thể bắt đầu tạo Function và Task"
              ]
            },
            {
              label: "Bước 3: Tạo Chức năng (Function)",
              description: "Tạo chức năng trong một tính năng",
              details: [
                "Vào tab 'Chức năng' (Functions)",
                "Click 'Tạo chức năng mới'",
                "Điền thông tin:",
                "  • Tiêu đề: Ví dụ 'Xử lý đăng nhập bằng email'",
                "  • Mô tả: Mô tả chi tiết về chức năng",
                "  • Tính năng: Chọn tính năng từ danh sách",
                "  • Ưu tiên: Chọn mức ưu tiên (Low, Medium, High, Critical)",
                "Click 'Tạo' để hoàn tất",
                "Lưu ý: Trạng thái chức năng sẽ tự động cập nhật dựa trên trạng thái của các công việc bên trong"
              ]
            },
            {
              label: "Bước 4: Tạo Công việc (Task)",
              description: "Tạo các công việc cụ thể để hoàn thành chức năng",
              details: [
                "Cách 1: Trong trang 'Chức năng', click vào một chức năng → Tab 'Công việc' → 'Tạo công việc mới'",
                "Cách 2: Vào tab 'Công việc' (Tasks) → Click 'Tạo công việc mới'",
                "Điền thông tin bắt buộc:",
                "  • Tên công việc: Ví dụ 'Thiết kế form đăng nhập'",
                "  • Trạng thái: Chọn 'To Do' (mặc định)",
                "Điền thông tin tùy chọn:",
                "  • Mô tả: Mô tả chi tiết về công việc",
                "  • Chức năng: Chọn chức năng đã tạo ở bước 3",
                "  • Ưu tiên: Chọn mức ưu tiên",
                "  • Người được giao: Chọn thành viên trong team (hoặc để trống)",
                "  • Ngày bắt đầu và hạn chót",
                "  • Ước tính thời gian (giờ)",
                "Click 'Tạo công việc' để hoàn tất",
                "Lưu ý: Khi bạn cập nhật trạng thái công việc, trạng thái của chức năng → tính năng → milestone sẽ tự động cập nhật"
              ]
            },
            {
              label: "Bước 5: Cập nhật trạng thái công việc",
              description: "Theo dõi và cập nhật tiến độ công việc",
              details: [
                "Vào trang 'Công việc' → Click vào công việc để xem chi tiết",
                "Trong sidebar, chọn trạng thái:",
                "  • 'To Do': Công việc chưa bắt đầu",
                "  • 'Doing': Đang thực hiện",
                "  • 'Done': Đã hoàn thành",
                "Hệ thống tự động cập nhật:",
                "  • Nếu tất cả tasks trong function là 'Done' → Function tự động 'Done'",
                "  • Nếu tất cả functions trong feature là 'Done' → Feature tự động 'Done'",
                "  • Nếu tất cả features trong milestone là 'Done' → Milestone tự động 'Done'",
                "Cập nhật thời gian thực tế: Nhập số giờ đã làm trong trường 'Actual'"
              ]
            },
            {
              label: "Bước 6: Thiết lập Dependencies (Tùy chọn)",
              description: "Thiết lập mối quan hệ phụ thuộc giữa các công việc",
              details: [
                "Vào trang 'Công việc' → Click vào một công việc để xem chi tiết",
                "Chọn tab 'Phụ thuộc' (Dependencies)",
                "Click 'Thêm phụ thuộc'",
                "Chọn công việc phụ thuộc và loại phụ thuộc:",
                "  • Finish-to-Start (FS): Công việc B bắt đầu sau khi A kết thúc",
                "  • Start-to-Start (SS): Công việc B bắt đầu cùng lúc với A",
                "  • Finish-to-Finish (FF): Công việc B kết thúc cùng lúc với A",
                "  • Start-to-Finish (SF): Công việc B kết thúc khi A bắt đầu",
                "Click 'Thêm' để lưu",
                "Lưu ý: Hệ thống sẽ cảnh báo nếu bạn cố gắng thay đổi trạng thái vi phạm dependencies"
              ]
            },
            {
              label: "Bước 7: Theo dõi tiến độ",
              description: "Sử dụng các công cụ để theo dõi tiến độ",
              details: [
                "Bảng điều khiển: Vào tab 'Công việc' → Chọn view 'Bảng điều khiển' để xem:",
                "  • Tổng số công việc",
                "  • Phân bổ theo trạng thái",
                "  • Phân bổ theo ưu tiên",
                "  • Thống kê theo thành viên",
                "Gantt Chart: Chọn view 'Gantt' để xem timeline và dependencies",
                "Lọc và tìm kiếm: Sử dụng bộ lọc để xem công việc theo:",
                "  • Milestone, Feature, Function",
                "  • Trạng thái, Ưu tiên",
                "  • Người được giao",
                "  • Khoảng thời gian"
              ]
            }
          ]
        }
      ]
    },
    {
      title: "Quản lý công việc",
      icon: <AssignmentIcon />,
      sections: [
        {
          heading: "Xem danh sách công việc",
          content: "Truy cập vào trang công việc để quản lý các task:",
          items: [
            "Xem tất cả công việc được giao cho bạn",
            "Lọc công việc theo trạng thái, ưu tiên, tính năng, chức năng, milestone",
            "Tìm kiếm công việc theo từ khóa",
            "Sắp xếp công việc theo deadline hoặc ưu tiên",
            "Xem công việc dưới dạng bảng, kanban, calendar hoặc Gantt chart"
          ]
        },
        {
          heading: "Cập nhật công việc",
          content: "Cập nhật trạng thái và thông tin công việc:",
          items: [
            "Thay đổi trạng thái công việc (To Do, Doing, Done)",
            "Cập nhật tiến độ và thời gian thực tế (Actual hours)",
            "Thêm mô tả và ghi chú",
            "Thay đổi người được giao",
            "Cập nhật deadline",
            "Quản lý dependencies giữa các công việc",
            "Lưu ý: Khi cập nhật trạng thái, hệ thống tự động cập nhật trạng thái của Function → Feature → Milestone"
          ]
        },
        {
          heading: "Xem chi tiết công việc",
          content: "Click vào một công việc để xem chi tiết:",
          items: [
            "Xem thông tin đầy đủ về công việc",
            "Xem dependencies và công việc liên quan",
            "Thêm bình luận để trao đổi với team",
            "Tải lên và quản lý tệp đính kèm",
            "Theo dõi lịch sử hoạt động (Activity log)",
            "Xem ID của công việc, chức năng và tính năng liên quan"
          ]
        }
      ]
    },
    {
      title: "Quản lý chức năng và tính năng",
      icon: <BookIcon />,
      sections: [
        {
          heading: "Xem chức năng (Functions)",
          content: "Xem các chức năng trong dự án:",
          items: [
            "Xem danh sách chức năng thuộc các tính năng",
            "Xem trạng thái tự động của chức năng (dựa trên công việc)",
            "Xem các công việc liên quan đến mỗi chức năng",
            "Tạo công việc mới trong chức năng"
          ]
        },
        {
          heading: "Xem tính năng (Features)",
          content: "Xem các tính năng trong dự án:",
          items: [
            "Xem danh sách tính năng",
            "Xem trạng thái tự động của tính năng (dựa trên chức năng)",
            "Xem các chức năng thuộc mỗi tính năng",
            "Theo dõi milestone liên quan"
          ]
        }
      ]
    },
    {
      title: "Giao tiếp",
      icon: <ChatIcon />,
      sections: [
        {
          heading: "Tin nhắn nhóm",
          content: "Giao tiếp với các thành viên trong team:",
          items: [
            "Truy cập tin nhắn của team bạn tham gia",
            "Gửi và nhận tin nhắn với các thành viên",
            "Theo dõi số tin nhắn chưa đọc"
          ]
        },
        {
          heading: "Thông báo",
          content: "Nhận thông báo về các hoạt động:",
          items: [
            "Xem thông báo về công việc mới",
            "Nhận thông báo khi có cập nhật quan trọng",
            "Quản lý và đánh dấu đã đọc các thông báo"
          ]
        }
      ]
    },
    {
      title: "Theo dõi tiến độ",
      icon: <TimelineIcon />,
      sections: [
        {
          heading: "Gantt Chart",
          content: "Sử dụng Gantt chart để theo dõi tiến độ:",
          items: [
            "Xem timeline của các milestone và tính năng",
            "Theo dõi dependencies giữa các công việc",
            "Lọc theo milestone, tính năng hoặc chức năng",
            "Xem trạng thái màu sắc của từng milestone"
          ]
        },
        {
          heading: "Báo cáo cá nhân",
          content: "Xem báo cáo về công việc của bạn:",
          items: [
            "Xem thống kê công việc đã hoàn thành",
            "Theo dõi tiến độ theo thời gian",
            "Xem phân bổ công việc theo trạng thái"
          ]
        }
      ]
    }
  ];

  const guide = isSupervisor ? supervisorGuide : studentGuide;
  const roleName = isSupervisor ? "Giảng viên" : "Sinh viên";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f9fafb", py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 4, mb: 4, bgcolor: "white" }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: isSupervisor
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <BookIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                Hướng dẫn sử dụng
              </Typography>
              <Chip
                label={roleName}
                size="small"
                sx={{
                  bgcolor: isSupervisor ? "#667eea15" : "#f5576c15",
                  color: isSupervisor ? "#667eea" : "#f5576c",
                  fontWeight: 600,
                }}
              />
            </Box>
          </Stack>
          <Typography variant="body1" color="text.secondary">
            Hướng dẫn chi tiết về cách sử dụng hệ thống quản lý dự án cho {roleName.toLowerCase()}
          </Typography>
        </Paper>

        {/* Guide Content */}
        <Stack spacing={3}>
          {guide.map((section, sectionIndex) => (
            <Paper key={sectionIndex} sx={{ p: 4, bgcolor: "white" }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: isSupervisor ? "#667eea15" : "#f5576c15",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isSupervisor ? "#667eea" : "#f5576c",
                  }}
                >
                  {section.icon}
                </Box>
                <Typography variant="h5" fontWeight={700}>
                  {section.title}
                </Typography>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              <Stack spacing={4}>
                {section.sections.map((subsection, subsectionIndex) => (
                  <Box key={subsectionIndex}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
                      {subsection.heading}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      {subsection.content}
                    </Typography>
                    {'steps' in subsection && subsection.steps ? (
                      <Stepper orientation="vertical" sx={{ mt: 2 }}>
                        {subsection.steps.map((step: any, stepIndex: number) => (
                          <Step key={stepIndex} active={true} completed={false}>
                            <StepLabel
                              StepIconComponent={() => (
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    bgcolor: isSupervisor ? "#667eea" : "#f5576c",
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                  }}
                                >
                                  {stepIndex + 1}
                                </Box>
                              )}
                            >
                              <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                                {step.label}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {step.description}
                              </Typography>
                            </StepLabel>
                            <StepContent>
                              <Stack spacing={1} sx={{ pl: 2, mt: 1 }}>
                                {step.details.map((detail: string, detailIndex: number) => (
                                  <Stack key={detailIndex} direction="row" spacing={1.5} alignItems="flex-start">
                                    {detail.trim().startsWith("•") || detail.trim().startsWith("-") ? (
                                      <>
                                        <PlayArrowIcon
                                          sx={{
                                            fontSize: 16,
                                            color: isSupervisor ? "#667eea" : "#f5576c",
                                            mt: 0.5,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          sx={{ fontFamily: detail.includes(":") ? "monospace" : "inherit" }}
                                        >
                                          {detail.replace(/^[•-]\s*/, "")}
                                        </Typography>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircleIcon
                                          sx={{
                                            fontSize: 16,
                                            color: isSupervisor ? "#667eea" : "#f5576c",
                                            mt: 0.5,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          sx={{ fontWeight: detail.includes(":") ? 600 : 400 }}
                                        >
                                          {detail}
                                        </Typography>
                                      </>
                                    )}
                                  </Stack>
                                ))}
                              </Stack>
                            </StepContent>
                          </Step>
                        ))}
                      </Stepper>
                    ) : (
                      <Stack spacing={1}>
                        {'items' in subsection && subsection.items?.map((item: string, itemIndex: number) => (
                          <Stack key={itemIndex} direction="row" spacing={1.5} alignItems="flex-start">
                            <CheckCircleIcon
                              sx={{
                                fontSize: 20,
                                color: isSupervisor ? "#667eea" : "#f5576c",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {item}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                    {subsectionIndex < section.sections.length - 1 && (
                      <Divider sx={{ mt: 3 }} />
                    )}
                  </Box>
                ))}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

