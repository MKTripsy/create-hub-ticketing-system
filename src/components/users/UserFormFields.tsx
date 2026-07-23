import { Space } from '@/lib/api/spaces'

type FormState = {
  first_name: string
  last_name: string
  birthdate: string
  grade_level: string
  primary_space_id: string
}

type Props = {
  form: FormState
  onChange: (updates: Partial<FormState>) => void
  spaces: Space[]
  secondarySpaceIds: number[]
  onToggleSecondarySpace: (spaceId: number) => void
  onPrimarySpaceChange: (spaceId: string) => void
  // photoPreview: string | null                                              Uncomment for profile picture funnctionality
  // onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void          Uncomment for profile picture funnctionality
  // onRemovePhoto: () => void                                                Uncomment for profile picture funnctionality
  disabled?: boolean
  accentColor?: string
  showAutoAssignHint?: boolean
}

export default function UserFormFields({
  form,
  onChange,
  spaces,
  secondarySpaceIds,
  onToggleSecondarySpace,
  onPrimarySpaceChange,
  // photoPreview,     Uncomment for profile picture funnctionality
  // onPhotoChange,
  // onRemovePhoto,
  disabled = false,
  accentColor = '#FF6347',
  showAutoAssignHint = false,
}: Props) {
  const inputClass = `w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[${accentColor}] disabled:bg-gray-50 disabled:text-gray-500`

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Basic Information</h2>

      {/* First Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          First Name {!disabled && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          required={!disabled}
          value={form.first_name}
          onChange={e => onChange({ first_name: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="First Name"
        />
      </div>

      {/* Last Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Last Name {!disabled && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          required={!disabled}
          value={form.last_name}
          onChange={e => onChange({ last_name: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="Last Name"
        />
      </div>

      {/* Birthdate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Birthdate {!disabled && <span className="text-red-500">*</span>}
        </label>
        <input
          type="date"
          required={!disabled}
          value={form.birthdate}
          onChange={e => onChange({ birthdate: e.target.value })}
          disabled={disabled}
          className={inputClass}
        />
      </div>

      {/* Grade Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Grade Level {!disabled && <span className="text-red-500">*</span>}
        </label>
        <select
          required={!disabled}
          value={form.grade_level}
          onChange={e => onChange({ grade_level: e.target.value })}
          disabled={disabled}
          className={inputClass}
        >
          <option value="">Select grade level</option>
          <option value="Not Enrolled">Not Enrolled</option>
          <option value="Daycare">Daycare</option>
          <option value="Kindergarten">Kindergarten</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      </div>

      {/* Primary Space */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Primary Component {!disabled && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-4 mb-3">
          {spaces.map(space => (
            <label
              key={space.id}
              className={`flex items-center gap-2 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <input
                type="radio"
                name="space"
                value={space.id}
                checked={form.primary_space_id === space.id.toString()}
                onChange={e => onPrimarySpaceChange(e.target.value)}
                disabled={disabled}
                style={{ accentColor }}
                className="accent-inherit"
              />
              <span className="text-sm text-gray-700">{space.space_name}</span>
            </label>
          ))}
        </div>

        {showAutoAssignHint && form.grade_level && (
          <p className="text-xs text-blue-500 mt-1">
            Auto-assigned based on grade level. You may override this.
          </p>
        )}

        {/* Secondary Spaces */}
        {form.primary_space_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Components <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <div className="flex gap-4">
              {spaces
                .filter(s => s.id.toString() !== form.primary_space_id)
                .map(space => (
                  <label
                    key={space.id}
                    className={`flex items-center gap-2 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={secondarySpaceIds.includes(space.id)}
                      onChange={() => !disabled && onToggleSecondarySpace(space.id)}
                      disabled={disabled}
                      style={{ accentColor }}
                      className="accent-inherit"
                    />
                    <span className="text-sm text-gray-700">{space.space_name}</span>
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}