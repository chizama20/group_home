import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Resident } from '../../types/resident'
import { getResident } from '../../api/residents'
import BottomNav from '../../components/BottomNav'

function ageFromDob(dob: string) {
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between items-start gap-4 text-sm py-1'>
      <dt className='text-gray-500 shrink-0'>{label}</dt>
      <dd className='text-gray-900 font-medium text-right'>{value}</dd>
    </div>
  )
}

export default function ResidentProfile() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const [resident, setResident] = useState<Resident | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getResident(id)
      .then(res => setResident(res.data.data ?? null))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className='p-4 text-sm text-gray-500'>Loading…</div>
  if (error)   return <div className='p-4 text-sm text-red-600'>{error}</div>
  if (!resident) return <div className='p-4 text-sm text-gray-500'>Resident not found</div>

  return (
    <div className='pb-20 min-h-screen bg-gray-50'>
      <div className='bg-white px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3'>
        <button
          onClick={() => navigate(-1)}
          className='text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl'
          aria-label='Back'
        >
          ←
        </button>
        <div>
          <h1 className='text-xl font-bold text-gray-900'>
            {resident.first_name} {resident.last_name}
          </h1>
          {resident.room && <p className='text-sm text-gray-500'>Room {resident.room}</p>}
        </div>
      </div>

      <div className='space-y-3 p-4'>
        <div className='bg-white rounded-xl p-4 shadow-sm'>
          <h2 className='text-xs font-semibold text-gray-400 uppercase mb-3'>Personal</h2>
          <dl>
            <Row label='Date of birth' value={`${resident.date_of_birth} · age ${ageFromDob(resident.date_of_birth)}`} />
            {resident.diagnosis && <Row label='Diagnosis' value={resident.diagnosis} />}
            {resident.physician && <Row label='Physician' value={resident.physician} />}
          </dl>
        </div>

        {(resident.primary_contact_name ?? resident.primary_contact_phone) && (
          <div className='bg-white rounded-xl p-4 shadow-sm'>
            <h2 className='text-xs font-semibold text-gray-400 uppercase mb-3'>Primary Contact</h2>
            <dl>
              {resident.primary_contact_name     && <Row label='Name'     value={resident.primary_contact_name} />}
              {resident.primary_contact_phone    && <Row label='Phone'    value={resident.primary_contact_phone} />}
              {resident.primary_contact_relation && <Row label='Relation' value={resident.primary_contact_relation} />}
            </dl>
          </div>
        )}

        {resident.notes && (
          <div className='bg-white rounded-xl p-4 shadow-sm'>
            <h2 className='text-xs font-semibold text-gray-400 uppercase mb-2'>Notes</h2>
            <p className='text-sm text-gray-700 whitespace-pre-wrap'>{resident.notes}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
