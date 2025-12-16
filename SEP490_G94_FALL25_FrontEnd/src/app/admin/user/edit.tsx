import { X, User as UserIcon, Mail, Phone, Shield } from 'lucide-react';
import Lock from 'lucide-react/dist/esm/icons/lock';

export interface User {
  _id: string;
  email: string;
  full_name: string;
  role: number;
  avatar?: string;
  phone?: string;
  createdAt: string;
}

export interface EditUserForm {
  full_name: string;
  email: string;
  role: number;
  phone: string;
  password?: string;
}

interface EditUserModalProps {
  user: User | null;
  onClose: () => void;
  onSubmit: (data: EditUserForm) => Promise<void>;
  loading: boolean;
}

export default function EditUserModal({ user, onClose, onSubmit, loading }: EditUserModalProps) {
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await onSubmit({
        full_name: formData.get('full_name') as string,
        email: formData.get('email') as string,
        role: Number(formData.get('role')),
        phone: formData.get('phone') as string,
        password: (formData.get('password') as string) || undefined,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const getRoleColor = (role: number) => {
    switch (role) {
      case 8: return 'bg-purple-50 text-purple-700 border-purple-200';
      case 4: return 'bg-green-50 text-green-700 border-green-200';
      case 1: return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleName = (role: number) => {
    switch (role) {
      case 8: return 'Admin';
      case 4: return 'Giám sát viên';
      case 1: return 'Sinh viên';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-xl p-8 relative animate-modal-in shadow-2xl border border-gray-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-white">
                  {user.full_name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                Chỉnh sửa thông tin người dùng
              </h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm border mt-1 ${getRoleColor(user.role)}`}>
                {getRoleName(user.role)}
              </span>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Họ và tên
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                name="full_name"
                defaultValue={user.full_name}
                type="text"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-300"
                required
                placeholder="Nhập họ và tên"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                name="email"
                defaultValue={user.email}
                type="email"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-300"
                required
                placeholder="example@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Role Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vai trò
              </label>
              <div className="relative">
                <Shield className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <select
                  name="role"
                  defaultValue={user.role}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-300 appearance-none bg-white"
                  required
                >
                  <option value={1}>Sinh viên</option>
                  <option value={4}>Giám sát viên</option>
                  <option value={8}>Admin</option>
                </select>
                <div className="absolute right-4 top-4 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  name="phone"
                  defaultValue={user.phone || ''}
                  type="tel"
                  pattern="[0-9]*"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-300"
                  placeholder="Nhập số điện thoại"
                />
              </div>
            </div>
          </div>

          {/* Password Field (optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Mật khẩu mới (tuỳ chọn)
              </label>
              <span className="text-xs text-gray-400">Để trống nếu không đổi</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                name="password"
                type="password"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-300"
                placeholder="Nhập mật khẩu mới (tuỳ chọn)"
                minLength={6}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium hover:border-gray-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-white bg-blue-500 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:bg-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                "Cập nhật"
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes modal-in {
          from { 
            opacity: 0; 
            transform: translateY(-8px) scale(0.98);
            filter: blur(8px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        .animate-modal-in {
          animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}