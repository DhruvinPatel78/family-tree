import React from 'react';
import { X, Calendar, Mail, Phone, MapPin, Briefcase, User, Edit3, Trash2 } from 'lucide-react';
import { FamilyMember } from '../../types/family';
import { useAuth } from '../../contexts/AuthContext';

interface MemberModalProps {
  member: FamilyMember;
  onClose: () => void;
  onEdit: (member: FamilyMember) => void;
  onDelete: (memberId: string) => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({ 
  member, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  const { userData } = useAuth();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getAge = (dateString: string) => {
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const canEdit = userData?.isAdmin || userData?.uid === member.createdBy;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${member.name}? This action cannot be undone.`)) {
      onDelete(member.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mx-auto mb-4 shadow-lg">
              {member.imageUrl ? (
                <img 
                  src={member.imageUrl} 
                  alt={member.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-blue-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{member.name}</h2>
            <p className="text-gray-600">Age: {getAge(member.dateOfBirth)} years old</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Date of Birth</p>
                <p className="text-gray-600">{formatDate(member.dateOfBirth)}</p>
              </div>
            </div>

            {member.email && (
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-gray-600">{member.email}</p>
                </div>
              </div>
            )}

            {member.phone && (
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Phone</p>
                  <p className="text-gray-600">{member.phone}</p>
                </div>
              </div>
            )}

            {member.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Address</p>
                  <p className="text-gray-600">{member.address}</p>
                </div>
              </div>
            )}

            {member.occupation && (
              <div className="flex items-start space-x-3">
                <Briefcase className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Occupation</p>
                  <p className="text-gray-600">{member.occupation}</p>
                </div>
              </div>
            )}

            {member.bio && (
              <div>
                <p className="font-medium text-gray-900 mb-2">Biography</p>
                <p className="text-gray-600 leading-relaxed">{member.bio}</p>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => onEdit(member)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};