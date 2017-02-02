﻿using System.Collections.Generic;
using System.Threading.Tasks;
using Components.Interface;

namespace Components.Scripting
{
	/// <summary>
	/// Describes the properties and methods of an object that executes
	/// a script.
	/// </summary>
	public interface IScriptExecutor
	{
		/// <summary>
		/// Executes the script.
		/// </summary>
		/// <returns><c>true</c> if the script completed
		/// successfully; <c>false</c> otherwise.</returns>
		Task<IList<Instruction>> Execute(IScript p_scpScript);
	}
}
