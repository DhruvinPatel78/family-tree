import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { FamilyMember, TreeNode } from '../../types/family';
import { MemberCard } from './MemberCard';
import { MemberModal } from './MemberModal';
import { AddMemberForm } from './AddMemberForm';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Users, Trash2, CheckCircle } from 'lucide-react';

export const FamilyTree: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const { userData, currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchMembers = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'familyMembers')
      );
      const querySnapshot = await getDocs(q);
      const membersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FamilyMember[];
      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching family members:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (): TreeNode[] => {
    const memberMap = new Map<string, FamilyMember>();
    members.forEach(member => memberMap.set(member.id, member));

    const roots: TreeNode[] = [];
    const processed = new Set<string>();

    const buildNode = (member: FamilyMember): TreeNode => {
      const children = members
        .filter(m => m.parentId === member.id && !processed.has(m.id))
        .map(child => {
          processed.add(child.id);
          return buildNode(child);
        });

      const spouse = member.spouseId ? memberMap.get(member.spouseId) : undefined;

      return {
        member,
        children,
        spouse
      };
    };

    members
      .filter(member => !member.parentId && !processed.has(member.id))
      .forEach(rootMember => {
        processed.add(rootMember.id);
        roots.push(buildNode(rootMember));
      });

    return roots;
  };

  const deleteImageFromStorage = async (imageUrl: string) => {
    if (!imageUrl || !imageUrl.includes('firebase')) return;
    
    try {
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        const imagePath = decodeURIComponent(pathMatch[1]);
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
      }
    } catch (error) {
      console.error('Error deleting image from storage:', error);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    const memberToDelete = members.find(m => m.id === memberId);
    if (!memberToDelete) return;

    // Check if user has permission to delete
    const canDelete = userData?.isAdmin || userData?.uid === memberToDelete.createdBy;
    if (!canDelete) {
      alert('You do not have permission to delete this member.');
      return;
    }

    // Check if member has children
    const hasChildren = members.some(m => m.parentId === memberId);
    if (hasChildren) {
      alert('Cannot delete this member as they have children in the family tree. Please remove or reassign their children first.');
      return;
    }

    setDeletingMember(memberId);

    try {
      // Delete the member's image from storage if it exists
      if (memberToDelete.imageUrl) {
        await deleteImageFromStorage(memberToDelete.imageUrl);
      }

      // Update spouse relationship if exists
      if (memberToDelete.spouseId) {
        const spouse = members.find(m => m.id === memberToDelete.spouseId);
        if (spouse) {
          // Remove spouse relationship (this would require updating the spouse's record)
          // For now, we'll just delete the member and the relationship will be broken
        }
      }

      // Delete the member from Firestore
      await deleteDoc(doc(db, 'familyMembers', memberId));
      
      // Show success state
      setDeleteSuccess(true);
      setSelectedMember(null);
      
      // Wait a moment to show success, then refresh
      setTimeout(async () => {
        await fetchMembers();
        setDeleteSuccess(false);
      }, 1500);

    } catch (error) {
      console.error('Error deleting family member:', error);
      alert('Failed to delete family member. Please try again.');
    } finally {
      setDeletingMember(null);
    }
  };

  const handleFormSuccess = async () => {
    // Refresh the family tree data
    await fetchMembers();
    // Close the forms
    setShowAddForm(false);
    setEditingMember(null);
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const { member, children, spouse } = node;
    
    return (
      <div key={member.id} className="flex flex-col items-center">
        <div className="flex items-center space-x-4 mb-8">
          <MemberCard
            member={member}
            onClick={() => setSelectedMember(member)}
            isRoot={level === 0}
          />
          {spouse && (
            <>
              <div className="w-8 h-px bg-gray-400"></div>
              <MemberCard
                member={spouse}
                onClick={() => setSelectedMember(spouse)}
              />
            </>
          )}
        </div>
        
        {children.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-400 mb-4"></div>
            <div className="flex space-x-12">
              {children.map((child, index) => (
                <div key={child.member.id} className="relative">
                  {index > 0 && (
                    <div className="absolute -top-4 left-0 w-full h-px bg-gray-400 transform -translate-x-1/2"></div>
                  )}
                  {renderTreeNode(child, level + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Show delete success state
  if (deleteSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Member Deleted!
          </h3>
          <p className="text-gray-600">
            The family member has been successfully removed from your family tree.
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show deleting state
  if (deletingMember) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Deleting Member...
          </h3>
          <p className="text-gray-600 mb-4">
            Please wait while we remove the family member from your tree.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family tree...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Please Log In</h2>
          <p className="text-gray-500">You need to be logged in to view your family tree.</p>
        </div>
      </div>
    );
  }

  const treeRoots = buildTree();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Family Tree</h1>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Member</span>
          </button>
        </div>

        {treeRoots.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">No Family Members Yet</h2>
            <p className="text-gray-500 mb-6">Start building your family tree by adding the first member.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Add First Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col items-center space-y-16 min-w-full py-8">
              {treeRoots.map(root => renderTreeNode(root))}
            </div>
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onEdit={setEditingMember}
          onDelete={handleDeleteMember}
        />
      )}

      {(showAddForm || editingMember) && (
        <AddMemberForm
          member={editingMember}
          onClose={() => {
            setShowAddForm(false);
            setEditingMember(null);
          }}
          onSuccess={handleFormSuccess}
          availableParents={members}
        />
      )}
    </div>
  );
};