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
  photoPreview: string | null
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePhoto: () => void
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
  photoPreview,
  onPhotoChange,
  onRemovePhoto,
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

      {/* Profile Photo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl border border-gray-200">
              👤
            </div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={onPhotoChange}
              className="hidden"
              id="photo-upload"
              disabled={disabled}
            />
            <label
              htmlFor="photo-upload"
              className={`px-4 py-2 rounded-lg text-sm ${
                disabled
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
              }`}
            >
              Choose Photo
            </label>
            {photoPreview && !disabled && (
              <button
                type="button"
                onClick={onRemovePhoto}
                className="ml-2 text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            )}
          </div>
        </div>
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