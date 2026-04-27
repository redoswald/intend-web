import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { useUpdateProject } from '@/hooks/useProjects'
import { useCreateSection } from '@/hooks/useSections'
import type { Project } from '@/types'

const COLLAPSED_DESCRIPTION_HEIGHT = 240

interface ProjectHeaderProps {
  project: Project
  sections?: Array<{ id: string; name: string }>
}

export function ProjectHeader({ project, sections }: ProjectHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [name, setName] = useState(project.name)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [description, setDescription] = useState(project.description ?? '')
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [sectionName, setSectionName] = useState('')
  const [isDescExpanded, setIsDescExpanded] = useState(false)
  const [isDescOverflowing, setIsDescOverflowing] = useState(false)
  const descContentRef = useRef<HTMLDivElement>(null)

  const updateProject = useUpdateProject()
  const createSection = useCreateSection()

  useLayoutEffect(() => {
    const el = descContentRef.current
    if (!el) {
      setIsDescOverflowing(false)
      return
    }
    setIsDescOverflowing(el.scrollHeight > COLLAPSED_DESCRIPTION_HEIGHT + 4)
  }, [project.description, isEditingDesc])

  useEffect(() => {
    setIsDescExpanded(false)
  }, [project.id])

  async function handleSaveName() {
    if (!name.trim()) return
    try {
      await updateProject.mutateAsync({
        id: project.id,
        name: name.trim(),
      })
      setIsEditingName(false)
    } catch (err) {
      console.error('Failed to update name:', err)
    }
  }

  async function handleSaveDescription() {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        description: description.trim() || null,
      })
      setIsEditingDesc(false)
    } catch (err) {
      console.error('Failed to update description:', err)
    }
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault()
    if (!sectionName.trim()) return

    try {
      await createSection.mutateAsync({
        projectId: project.id,
        name: sectionName.trim(),
      })
      setSectionName('')
      setIsAddingSection(false)
    } catch (err) {
      console.error('Failed to create section:', err)
    }
  }

  return (
    <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
      {/* Title and description section */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        {/* Editable project name */}
        {isEditingName ? (
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 text-lg font-semibold px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') {
                  setName(project.name)
                  setIsEditingName(false)
                }
              }}
            />
            <button
              onClick={handleSaveName}
              disabled={!name.trim() || updateProject.isPending}
              className="px-3 py-1.5 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-md disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setName(project.name)
                setIsEditingName(false)
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 group">
            <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
            <button
              onClick={() => setIsEditingName(true)}
              className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-accent-600 transition-opacity"
            >
              Edit
            </button>
          </div>
        )}

        {/* Description */}
        {isEditingDesc ? (
          <div className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this project... What is it? What does 'done' look like? Any important context? (Markdown supported)"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDescription}
                disabled={updateProject.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-md disabled:opacity-50"
              >
                {updateProject.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setDescription(project.description ?? '')
                  setIsEditingDesc(false)
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : project.description ? (
          <div className="group">
            <div
              className="relative overflow-hidden"
              style={{
                maxHeight:
                  isDescOverflowing && !isDescExpanded ? COLLAPSED_DESCRIPTION_HEIGHT : undefined,
              }}
            >
              <div ref={descContentRef} className="markdown-content text-sm text-gray-600">
                <Markdown
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mt-3 mb-2 first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold text-gray-900 mt-3 mb-1 first:mt-0">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1 first:mt-0">{children}</h3>,
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    a: ({ href, children }) => <a href={href} className="text-accent-600 hover:underline">{children}</a>,
                    code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                  }}
                >
                  {project.description}
                </Markdown>
              </div>
              {isDescOverflowing && !isDescExpanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-gray-50 to-transparent" />
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              {isDescOverflowing && (
                <button
                  onClick={() => setIsDescExpanded((v) => !v)}
                  className="text-xs font-medium text-accent-600 hover:text-accent-700"
                >
                  {isDescExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
              <button
                onClick={() => setIsEditingDesc(true)}
                className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-accent-600 transition-opacity"
              >
                Edit description
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingDesc(true)}
            className="text-sm text-gray-400 hover:text-accent-600 italic"
          >
            + Add description
          </button>
        )}
      </div>

      {/* Organize section - Table of Contents */}
      <div className="p-4 bg-white">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Sections</h3>

        {/* List of existing sections */}
        {sections && sections.length > 0 && (
          <ul className="mb-3 space-y-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#section-${section.id}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-accent-600 py-1"
                >
                  <span className="text-gray-400">#</span>
                  {section.name}
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* Add section */}
        {isAddingSection ? (
          <form onSubmit={handleAddSection} className="flex items-center gap-2">
            <input
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Section name"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!sectionName.trim() || createSection.isPending}
              className="px-3 py-1.5 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-md disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingSection(false)
                setSectionName('')
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingSection(true)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent-600 transition-colors"
          >
            <PlusIcon />
            <span>Add section</span>
          </button>
        )}
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
