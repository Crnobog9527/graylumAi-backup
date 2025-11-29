import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FileText, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const categories = ['writing', 'marketing', 'coding', 'analysis', 'creative', 'business', 'other'];
const colors = ['indigo', 'purple', 'pink', 'blue', 'green', 'orange', 'red', 'cyan'];
const icons = ['Pen', 'Video', 'Copy', 'Code', 'BarChart3', 'Lightbulb', 'Briefcase', 'Sparkles'];

export default function TemplateManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'writing',
    system_prompt: '',
    starter_message: '',
    icon: 'Pen',
    color: 'indigo',
    credits_cost: 0,
    is_active: true,
    sort_order: 0,
  });
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => base44.entities.PromptTemplate.list('sort_order'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTemplate) {
        return base44.entities.PromptTemplate.update(editingTemplate.id, data);
      }
      return base44.entities.PromptTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PromptTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      toast.success('Template deleted');
    },
  });

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({
      title: '',
      description: '',
      category: 'writing',
      system_prompt: '',
      starter_message: '',
      icon: 'Pen',
      color: 'indigo',
      credits_cost: 0,
      is_active: true,
      sort_order: 0,
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      description: template.description || '',
      category: template.category,
      system_prompt: template.system_prompt,
      starter_message: template.starter_message || '',
      icon: template.icon || 'Pen',
      color: template.color || 'indigo',
      credits_cost: template.credits_cost || 0,
      is_active: template.is_active,
      sort_order: template.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Prompt Templates
        </CardTitle>
        <Button
          size="sm"
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Credits Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{template.category}</Badge>
                </TableCell>
                <TableCell>{template.credits_cost || 0}</TableCell>
                <TableCell>
                  <Badge variant={template.is_active ? "default" : "secondary"}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setSelectedTemplate(template); setPreviewOpen(true); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteMutation.mutate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Video Script Writer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this template does..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="You are an expert video script writer. Your task is to..."
                  rows={6}
                  required
                />
                <p className="text-xs text-slate-500">
                  This prompt constrains the AI's behavior for this template
                </p>
              </div>

              <div className="space-y-2">
                <Label>Starter Message (optional)</Label>
                <Textarea
                  value={formData.starter_message}
                  onChange={(e) => setFormData({ ...formData, starter_message: e.target.value })}
                  placeholder="Hello! I'm ready to help you write a video script..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {icons.map((icon) => (
                        <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData({ ...formData, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colors.map((color) => (
                        <SelectItem key={color} value={color} className="capitalize">{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Extra Credits</Label>
                  <Input
                    type="number"
                    value={formData.credits_cost}
                    onChange={(e) => setFormData({ ...formData, credits_cost: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {editingTemplate ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Template Preview: {selectedTemplate?.title}</DialogTitle>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-500">Category</Label>
                  <p className="capitalize">{selectedTemplate.category}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Description</Label>
                  <p>{selectedTemplate.description || 'No description'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">System Prompt</Label>
                  <div className="bg-slate-50 p-4 rounded-lg mt-1 text-sm whitespace-pre-wrap">
                    {selectedTemplate.system_prompt}
                  </div>
                </div>
                {selectedTemplate.starter_message && (
                  <div>
                    <Label className="text-slate-500">Starter Message</Label>
                    <div className="bg-slate-50 p-4 rounded-lg mt-1 text-sm whitespace-pre-wrap">
                      {selectedTemplate.starter_message}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}