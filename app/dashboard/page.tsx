import {redirect} from 'next/navigation';
import { getServerSession} from 'next-auth';
import {authOptions} from '../api/auth/[...nextauth]/route';
import Image from 'next/image';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/signIn');
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h1 className='text-3xl text-gray-900 font-bold mb-6'>
                        Dashboard
                    </h1>
                    <div className='mb-6'>
                        <p className='text-2xl text-gray-800 mb-4'>
                            Bienvenido, <span className='font-semibold'>{session.user.name || 'Usuario'}</span>
                        </p>
                    </div>

                    <div className='bg-gray-50 rounded-lg p-6 space-y-4'>
                        <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                            Información del Usuario
                        </h2>
                        {session.user.image && (
                            <div className='flex items-center mb-4'>
                                <Image
                                    src={session.user.image}
                                    alt="Foto de perfil"
                                    width={100}
                                    height={100}
                                    className='rounded-full mr-4'
                                />
                            </div>
                        )}
                        <div className='space-y-3'>
                            <div>
                                <p className='text-sm text-gray-500 mb-1'>Nombre</p>
                                <p className='text-lg font-medium text-gray-900'>
                                    {session.user.name || 'No disponible'}
                                </p>
                            </div>
                            <div>
                                <p className='text-sm text-gray-500 mb-1'>Correo electrónico</p>
                                <p className='text-lg font-medium text-gray-900'>
                                    {session.user.email || 'No disponible'}
                                </p>
                            </div>
                            {(session.user as any).id && (
                                <div>
                                    <p className='text-sm text-gray-500 mb-1'>ID de usuario</p>
                                    <p className='text-sm font-mono text-gray-600'>
                                        {(session.user as any).id}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

