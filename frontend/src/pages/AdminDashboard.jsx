import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('students');
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classSections, setClassSections] = useState([]);
    const [stats, setStats] = useState({ students: 0, teachers: 0, classSections: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('create'); // 'create' or 'edit'
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useToast();
    const confirm = useConfirm();
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setSearchTerm('');
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, studentsRes, teachersRes, sectionsRes] = await Promise.all([
                api.get('/api/admin/stats'),
                api.get('/api/admin/students'),
                api.get('/api/admin/teachers'),
                api.get('/api/admin/class-sections')
            ]);
            setStats(statsRes.data.stats);
            setStudents(studentsRes.data.students);
            setTeachers(teachersRes.data.teachers);
            setClassSections(sectionsRes.data.classSections);
        } catch (error) {
            toast.showError('Failed to fetch data');
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/admin/login');
    };

    const openCreateModal = (type) => {
        setModalType('create');
        setEditingItem(null);
        if (type === 'student') {
            setFormData({ name: '', rollNo: '', email: '', year: '', classSectionId: '' });
        } else if (type === 'teacher') {
            setFormData({ name: '', email: '' });
        } else if (type === 'classSection') {
            setFormData({ name: '', year: '', description: '', homeTeacherId: '' });
        }
        setShowModal(type);
    };

    const openEditModal = (type, item) => {
        setModalType('edit');
        setEditingItem(item);
        if (type === 'student') {
            setFormData({
                name: item.name,
                rollNo: item.rollNo,
                email: item.email || '',
                year: item.year || '',
                classSectionId: item.classSection?._id || ''
            });
        } else if (type === 'teacher') {
            setFormData({ name: item.name, email: item.email });
        } else if (type === 'classSection') {
            setFormData({
                name: item.name,
                year: item.year || '',
                description: item.description || '',
                homeTeacherId: item.homeTeacherId?._id || ''
            });
        }
        setShowModal(type);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (showModal === 'student') {
                const payload = { ...formData };
                if (payload.year) payload.year = parseInt(payload.year);
                if (!payload.classSectionId) delete payload.classSectionId;

                if (modalType === 'create') {
                    await api.post('/api/admin/students', payload);
                    toast.showSuccess('Student created with default password: student123');
                } else {
                    await api.put(`/api/admin/students/${editingItem._id}`, payload);
                    toast.showSuccess('Student updated');
                }
            } else if (showModal === 'teacher') {
                if (modalType === 'create') {
                    await api.post('/api/admin/teachers', formData);
                    toast.showSuccess('Teacher created with default password: teacher123');
                } else {
                    await api.put(`/api/admin/teachers/${editingItem._id}`, formData);
                    toast.showSuccess('Teacher updated');
                }
            } else if (showModal === 'classSection') {
                const payload = { ...formData };
                if (payload.year) payload.year = parseInt(payload.year);
                if (!payload.homeTeacherId) delete payload.homeTeacherId;

                if (modalType === 'create') {
                    await api.post('/api/admin/class-sections', payload);
                    toast.showSuccess('Class section created');
                } else {
                    await api.put(`/api/admin/class-sections/${editingItem._id}`, payload);
                    toast.showSuccess('Class section updated');
                }
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.showError(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (type, id, name) => {
        const confirmed = await confirm({
            title: `Delete ${type}?`,
            message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            if (type === 'student') {
                await api.delete(`/api/admin/students/${id}`);
            } else if (type === 'teacher') {
                await api.delete(`/api/admin/teachers/${id}`);
            } else if (type === 'classSection') {
                await api.delete(`/api/admin/class-sections/${id}`);
            }
            toast.showSuccess(`${type} deleted`);
            fetchData();
        } catch (error) {
            toast.showError(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleResetPassword = async (type, id, name) => {
        const confirmed = await confirm({
            title: 'Reset Password?',
            message: `Reset password for "${name}" to default?`,
            confirmText: 'Reset',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            if (type === 'student') {
                await api.post(`/api/admin/students/${id}/reset-password`);
                toast.showSuccess('Password reset to: student123');
            } else {
                await api.post(`/api/admin/teachers/${id}/reset-password`);
                toast.showSuccess('Password reset to: teacher123');
            }
        } catch (error) {
            toast.showError('Password reset failed');
        }
    };

    const tabs = [
        { id: 'students', label: 'Students', icon: '👨‍🎓', count: stats.students },
        { id: 'teachers', label: 'Teachers', icon: '👨‍🏫', count: stats.teachers },
        { id: 'sections', label: 'Class Sections', icon: '🏫', count: stats.classSections }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
                            <p className="text-xs text-slate-500">EduPulse Management</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`bg-white rounded-2xl p-5 shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${activeTab === tab.id ? 'border-indigo-500' : 'border-transparent'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">{tab.label}</p>
                                    <p className="text-3xl font-bold text-slate-800">{tab.count}</p>
                                </div>
                                <span className="text-3xl">{tab.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={`Search ${activeTab === 'sections' ? 'class sections' : activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-5 py-3 pl-12 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>                {/* Content Area */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                            <p className="text-slate-500 mt-4">Loading...</p>
                        </div>
                    ) : (
                        <>
                            {/* Students Tab */}
                            {activeTab === 'students' && (
                                <div>
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-slate-800">Students</h2>
                                        <button
                                            onClick={() => openCreateModal('student')}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all"
                                        >
                                            + Add Student
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Roll No</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Class</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Year</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {students.filter(s =>
                                                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                                ).map(student => (
                                                    <tr key={student._id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                                                        <td className="px-4 py-3 text-slate-600">{student.rollNo}</td>
                                                        <td className="px-4 py-3 text-slate-600">{student.classSection?.name || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {student.year ? `Year ${student.year}` : ''}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={() => openEditModal('student', student)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                    title="Edit"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleResetPassword('student', student._id, student.name)}
                                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                                    title="Reset Password"
                                                                >
                                                                    🔑
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete('student', student._id, student.name)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Delete"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {students.filter(s =>
                                                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                                ).length === 0 && (
                                                        <tr>
                                                            <td colSpan="5" className="px-4 py-12 text-center text-slate-500">
                                                                No students found. Click "Add Student" to create one.
                                                            </td>
                                                        </tr>
                                                    )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Teachers Tab */}
                            {activeTab === 'teachers' && (
                                <div>
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-slate-800">Teachers</h2>
                                        <button
                                            onClick={() => openCreateModal('teacher')}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all"
                                        >
                                            + Add Teacher
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {teachers.filter(t =>
                                                    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    t.email.toLowerCase().includes(searchTerm.toLowerCase())
                                                ).map(teacher => (
                                                    <tr key={teacher._id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-800">{teacher.name}</td>
                                                        <td className="px-4 py-3 text-slate-600">{teacher.email}</td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {new Date(teacher.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={() => openEditModal('teacher', teacher)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                    title="Edit"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleResetPassword('teacher', teacher._id, teacher.name)}
                                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                                    title="Reset Password"
                                                                >
                                                                    🔑
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete('teacher', teacher._id, teacher.name)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Delete"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {teachers.filter(t =>
                                                    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    t.email.toLowerCase().includes(searchTerm.toLowerCase())
                                                ).length === 0 && (
                                                        <tr>
                                                            <td colSpan="4" className="px-4 py-12 text-center text-slate-500">
                                                                No teachers found. Click "Add Teacher" to create one.
                                                            </td>
                                                        </tr>
                                                    )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Class Sections Tab */}
                            {activeTab === 'sections' && (
                                <div>
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-slate-800">Class Sections</h2>
                                        <button
                                            onClick={() => openCreateModal('classSection')}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all"
                                        >
                                            + Add Section
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Year</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Home Teacher</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Students</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {classSections.filter(s =>
                                                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    (s.homeTeacherId?.name && s.homeTeacherId.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                ).map(section => (
                                                    <tr key={section._id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-800">{section.name}</td>
                                                        <td className="px-4 py-3 text-slate-600">{section.year || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {section.homeTeacherId?.name || <span className="text-slate-400">Not assigned</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                                {section.studentCount || 0} students
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={() => openEditModal('classSection', section)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                    title="Edit"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete('classSection', section._id, section.name)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Delete"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {classSections.filter(s =>
                                                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    (s.homeTeacherId?.name && s.homeTeacherId.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                ).length === 0 && (
                                                        <tr>
                                                            <td colSpan="5" className="px-4 py-12 text-center text-slate-500">
                                                                No class sections found. Click "Add Section" to create one.
                                                            </td>
                                                        </tr>
                                                    )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b">
                            <h3 className="text-lg font-semibold text-slate-800">
                                {modalType === 'create' ? 'Create' : 'Edit'} {showModal === 'student' ? 'Student' : showModal === 'teacher' ? 'Teacher' : 'Class Section'}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {showModal === 'student' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number *</label>
                                        <input
                                            type="text"
                                            value={formData.rollNo}
                                            onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Class Section</label>
                                        <select
                                            value={formData.classSectionId}
                                            onChange={(e) => setFormData({ ...formData, classSectionId: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        >
                                            <option value="">Select Class Section</option>
                                            {classSections.map(section => (
                                                <option key={section._id} value={section._id}>{section.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {showModal === 'teacher' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {showModal === 'classSection' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Section Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            placeholder="e.g., 1A, 2B"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            placeholder="e.g., 2024"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Home Teacher</label>
                                        <select
                                            value={formData.homeTeacherId}
                                            onChange={(e) => setFormData({ ...formData, homeTeacherId: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        >
                                            <option value="">Select Home Teacher</option>
                                            {teachers.map(teacher => (
                                                <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </>
                            )}

                            {modalType === 'create' && (
                                <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
                                    ℹ️ Default password will be: <span className="font-mono font-medium">
                                        {showModal === 'student' ? 'student123' : showModal === 'teacher' ? 'teacher123' : ''}
                                    </span>
                                </p>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
                                >
                                    {modalType === 'create' ? 'Create' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )
            }
        </div >
    );
};

export default AdminDashboard;
